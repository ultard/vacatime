package me.ultard.vacatime.service

import jakarta.validation.Validator
import me.ultard.vacatime.domain.VacationStatus
import me.ultard.vacatime.dto.ImportApplyResult
import me.ultard.vacatime.dto.ImportMode
import me.ultard.vacatime.dto.ImportPreviewResult
import me.ultard.vacatime.dto.ImportRequest
import me.ultard.vacatime.dto.ImportRowResult
import me.ultard.vacatime.dto.VacationFilter
import me.ultard.vacatime.dto.VacationRequest
import me.ultard.vacatime.error.ConflictException
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.error.ValidationException
import me.ultard.vacatime.repository.VacationRepository
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVPrinter
import org.apache.commons.csv.CSVRecord
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.orm.ObjectOptimisticLockingFailureException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.io.StringReader
import java.io.StringWriter
import java.time.LocalDate
import java.util.UUID

@Service
class VacationCsvService(
    private val vacationRepository: VacationRepository,
    private val vacationService: VacationService,
    private val importRowService: VacationImportRowService,
    private val validator: Validator,
    private val objectMapper: ObjectMapper,
) {
    fun export(filter: VacationFilter): String {
        val writer = StringWriter()
        val format =
            CSVFormat.DEFAULT
                .builder()
                .setHeader(*HEADERS)
                .get()
        CSVPrinter(writer, format).use { printer ->
            for (vacation in vacationService.findAll(filter)) {
                printer.printRecord(
                    vacation.vacationNumber,
                    vacation.employee.id,
                    vacation.vacationType.id,
                    vacation.title,
                    vacation.description ?: "",
                    vacation.startDate,
                    vacation.endDate,
                    vacation.urgent,
                    objectMapper.writeValueAsString(vacation.tags),
                    vacation.status,
                    vacation.version,
                )
            }
        }
        return writer.toString()
    }

    @Transactional(readOnly = true)
    fun preview(importRequest: ImportRequest): ImportPreviewResult {
        val validRows = mutableListOf<ImportRowResult>()
        val invalidRows = mutableListOf<ImportRowResult>()
        val seenNumbers = mutableSetOf<String>()
        val format =
            CSVFormat.DEFAULT
                .builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .get()

        try {
            format.parse(StringReader(importRequest.csv.removePrefix("\uFEFF"))).use { parser ->
                if (!parser.headerMap.keys.containsAll(HEADERS.toList())) {
                    throw ValidationException(
                        "CSV must contain these headers: ${HEADERS.joinToString()}",
                    )
                }
                for (record in parser) {
                    if (validRows.size + invalidRows.size >= 500) {
                        throw ValidationException("At most 500 CSV rows can be imported at once")
                    }
                    val rowNumber = record.recordNumber.toInt() + 1
                    val vacationNumber = record.get("vacationNumber")
                    try {
                        if (vacationNumber.isBlank() || vacationNumber.length > 80) {
                            throw ValidationException(
                                "vacationNumber must be nonblank and at most 80 characters",
                            )
                        }
                        if (!seenNumbers.add(vacationNumber)) {
                            throw ConflictException("Duplicate vacation number in CSV")
                        }
                        val request = parseRequest(record)
                        val violations = validator.validate(request)
                        if (violations.isNotEmpty()) {
                            throw ValidationException(
                                violations.joinToString { "${it.propertyPath}: ${it.message}" },
                            )
                        }
                        val existing = vacationRepository.findByVacationNumber(vacationNumber)
                        if (existing != null && importRequest.mode == ImportMode.CREATE_ONLY) {
                            throw ConflictException("Vacation number already exists")
                        }
                        if (
                            existing != null &&
                            (request.version == null || request.version != existing.version)
                        ) {
                            throw ConflictException("Vacation version is stale")
                        }
                        vacationService.validateImport(request, existing?.id)
                        if (
                            request.status in VacationStatus.ACTIVE_STATUSES &&
                            validRows.any { previous ->
                                val planned = requireNotNull(previous.request)
                                planned.status in VacationStatus.ACTIVE_STATUSES &&
                                    planned.employeeId == request.employeeId &&
                                    planned.startDate <= request.endDate &&
                                    planned.endDate >= request.startDate
                            }
                        ) {
                            throw ConflictException("Vacation overlaps another row in CSV")
                        }
                        validRows += ImportRowResult(rowNumber, vacationNumber, request, null)
                    } catch (exception: RuntimeException) {
                        when (exception) {
                            is ConflictException,
                            is NotFoundException,
                            is ValidationException,
                            is IllegalArgumentException,
                            is tools.jackson.core.JacksonException,
                            ->
                                invalidRows +=
                                    ImportRowResult(
                                        rowNumber,
                                        vacationNumber,
                                        null,
                                        exception.message ?: "Invalid row",
                                    )
                            else -> throw exception
                        }
                    }
                }
            }
        } catch (exception: java.io.UncheckedIOException) {
            throw ValidationException("Malformed CSV")
        } catch (exception: java.io.IOException) {
            throw ValidationException("Malformed CSV")
        }
        return ImportPreviewResult(validRows, invalidRows)
    }

    fun apply(importRequest: ImportRequest): ImportApplyResult {
        val preview = preview(importRequest)
        val successfulIds = mutableListOf<UUID>()
        val errors =
            preview.invalidRows
                .associate { it.rowNumber to requireNotNull(it.error) }
                .toMutableMap()

        for (row in preview.validRows) {
            try {
                successfulIds +=
                    importRowService
                        .apply(
                            requireNotNull(row.vacationNumber),
                            requireNotNull(row.request),
                            importRequest.mode,
                        ).id
            } catch (exception: ConflictException) {
                errors[row.rowNumber] = exception.message ?: "Business conflict"
            } catch (exception: ObjectOptimisticLockingFailureException) {
                errors[row.rowNumber] = "Vacation version is stale"
            } catch (exception: DataIntegrityViolationException) {
                errors[row.rowNumber] = "Database constraint conflict"
            } catch (exception: NotFoundException) {
                errors[row.rowNumber] = exception.message ?: "Related entity not found"
            }
        }
        return ImportApplyResult(successfulIds, errors)
    }

    private fun parseRequest(record: CSVRecord): VacationRequest =
        VacationRequest(
            employeeId = UUID.fromString(record.get("employeeId")),
            vacationTypeId = UUID.fromString(record.get("vacationTypeId")),
            title = record.get("title"),
            description = record.get("description").ifBlank { null },
            startDate = LocalDate.parse(record.get("startDate")),
            endDate = LocalDate.parse(record.get("endDate")),
            urgent = record.get("urgent").toBooleanStrict(),
            tags = objectMapper.readValue(record.get("tags"), Array<String>::class.java).toSet(),
            status = VacationStatus.valueOf(record.get("status")),
            version = record.get("version").takeIf { it.isNotBlank() }?.toLong(),
        )

    companion object {
        private val HEADERS =
            arrayOf(
                "vacationNumber",
                "employeeId",
                "vacationTypeId",
                "title",
                "description",
                "startDate",
                "endDate",
                "urgent",
                "tags",
                "status",
                "version",
            )
    }
}
