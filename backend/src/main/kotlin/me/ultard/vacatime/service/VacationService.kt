package me.ultard.vacatime.service

import me.ultard.vacatime.domain.Vacation
import me.ultard.vacatime.domain.VacationPriority
import me.ultard.vacatime.domain.VacationStatus
import me.ultard.vacatime.dto.BulkOperation
import me.ultard.vacatime.dto.BulkRequest
import me.ultard.vacatime.dto.PageResponse
import me.ultard.vacatime.dto.VacationDto
import me.ultard.vacatime.dto.VacationFilter
import me.ultard.vacatime.dto.VacationRequest
import me.ultard.vacatime.error.ConflictException
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.error.ValidationException
import me.ultard.vacatime.mapper.toDto
import me.ultard.vacatime.repository.UserRepository
import me.ultard.vacatime.repository.VacationRepository
import me.ultard.vacatime.repository.VacationSpecifications
import me.ultard.vacatime.repository.VacationTypeRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
@Transactional(readOnly = true)
class VacationService(
    private val vacationRepository: VacationRepository,
    private val userRepository: UserRepository,
    private val vacationTypeRepository: VacationTypeRepository,
    private val auditService: AuditService,
) {
    fun list(
        filter: VacationFilter,
        page: Int,
        size: Int,
        sort: String,
        direction: Sort.Direction,
    ): PageResponse<VacationDto> {
        if (page < 0 || size <= 0 || sort !in setOf("createdAt", "startDate", "daysCount")) {
            throw ValidationException("Invalid pagination or vacation sort field")
        }
        val pageable =
            PageRequest.of(
                page,
                size.coerceAtMost(100),
                Sort.by(direction, sort).and(Sort.by("id")),
            )
        val result = vacationRepository.findAll(VacationSpecifications.matching(filter), pageable)
        return PageResponse(
            content = result.content.map { it.toDto() },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
        )
    }

    fun findAll(filter: VacationFilter): List<VacationDto> =
        vacationRepository.findAll(VacationSpecifications.matching(filter)).map { it.toDto() }

    fun get(id: UUID): VacationDto = findVacation(id).toDto()

    @Transactional
    fun create(
        request: VacationRequest,
        vacationNumber: String? = null,
    ): VacationDto {
        val vacation =
            Vacation(
                vacationNumber = vacationNumber ?: "VAC-${UUID.randomUUID()}",
                employee =
                    userRepository.findByIdForUpdate(request.employeeId)
                        ?: throw NotFoundException("Employee not found"),
                vacationType =
                    vacationTypeRepository.findById(request.vacationTypeId).orElseThrow {
                        NotFoundException("Vacation type not found")
                    },
                title = request.title,
                description = request.description,
                startDate = request.startDate,
                endDate = request.endDate,
                urgent = request.urgent,
                tags = request.tags.toMutableSet(),
                status = request.status,
            )
        if (vacation.vacationType?.active != true) {
            throw ConflictException("Vacation type is inactive")
        }
        validate(vacation)
        vacationRepository.saveAndFlush(vacation)
        auditService.log("CREATE", "VACATION", vacation.id)
        return vacation.toDto()
    }

    @Transactional
    fun update(
        id: UUID,
        request: VacationRequest,
    ): VacationDto {
        val vacation = findVacation(id)
        if (request.version == null || request.version != vacation.version) {
            throw ConflictException("Vacation version is stale")
        }
        checkStatusTransition(vacation, request.status)

        vacation.employee =
            userRepository.findByIdForUpdate(request.employeeId)
                ?: throw NotFoundException("Employee not found")
        if (vacation.vacationType?.id != request.vacationTypeId) {
            val vacationType =
                vacationTypeRepository.findById(request.vacationTypeId).orElseThrow {
                    NotFoundException("Vacation type not found")
                }
            if (!vacationType.active) {
                throw ConflictException("Vacation type is inactive")
            }
            vacation.vacationType = vacationType
        }
        val previousStatus = vacation.status
        vacation.title = request.title
        vacation.description = request.description
        vacation.startDate = request.startDate
        vacation.endDate = request.endDate
        vacation.urgent = request.urgent
        vacation.tags = request.tags.toMutableSet()
        vacation.status = request.status
        vacation.updatedAt = Instant.now()
        validate(vacation)
        vacationRepository.flush()
        auditService.log("UPDATE", "VACATION", id)
        if (previousStatus != vacation.status) {
            auditService.log(
                "CHANGE_STATUS",
                "VACATION",
                id,
                "$previousStatus -> ${vacation.status}",
            )
        }
        return vacation.toDto()
    }

    @Transactional
    fun archive(id: UUID) {
        val vacation = findVacation(id)
        vacation.archived = true
        vacation.updatedAt = Instant.now()
        auditService.log("ARCHIVE", "VACATION", id)
    }

    @Transactional
    fun restore(id: UUID) {
        val vacation = findVacation(id)
        userRepository.findByIdForUpdate(requireNotNull(vacation.employee).id)
        vacation.archived = false
        vacation.updatedAt = Instant.now()
        validate(vacation)
        auditService.log("RESTORE", "VACATION", id)
    }

    @Transactional
    fun permanentDelete(id: UUID) {
        val vacation = findVacation(id)
        vacationRepository.delete(vacation)
        auditService.log("PERMANENT_DELETE", "VACATION", id)
    }

    @Transactional
    fun applyBulkOperation(
        id: UUID,
        request: BulkRequest,
    ) {
        val vacation = findVacation(id)
        userRepository.findByIdForUpdate(requireNotNull(vacation.employee).id)
        when (request.operation) {
            BulkOperation.ARCHIVE -> vacation.archived = true
            BulkOperation.RESTORE -> vacation.archived = false
            BulkOperation.CHANGE_STATUS -> {
                val status = request.status ?: throw ValidationException("status is required")
                checkStatusTransition(vacation, status)
                vacation.status = status
            }
            BulkOperation.ADD_TAG -> vacation.tags.add(requireTag(request.tag))
            BulkOperation.REMOVE_TAG -> vacation.tags.remove(requireTag(request.tag))
        }
        vacation.updatedAt = Instant.now()
        validate(vacation)
        auditService.log(request.operation.name, "VACATION", id)
    }

    fun validateImport(
        request: VacationRequest,
        existingId: UUID? = null,
    ) {
        if (request.tags.size > 20 || request.tags.any { it.isBlank() || it.length > 100 }) {
            throw ValidationException(
                "At most 20 nonblank tags, each at most 100 characters, are allowed",
            )
        }
        if (request.startDate.isAfter(request.endDate)) {
            throw ConflictException("startDate must not be after endDate")
        }
        if (!userRepository.existsById(request.employeeId)) {
            throw NotFoundException("Employee not found")
        }
        val vacationType =
            vacationTypeRepository.findById(request.vacationTypeId).orElseThrow {
                NotFoundException("Vacation type not found")
            }
        if (existingId == null && !vacationType.active) {
            throw ConflictException("Vacation type is inactive")
        }
        if (existingId != null) {
            checkStatusTransition(findVacation(existingId), request.status)
        }
        if (
            request.status in ACTIVE_STATUSES &&
            vacationRepository.hasOverlappingVacation(
                request.employeeId,
                existingId ?: UUID(0, 0),
                ACTIVE_STATUSES,
                request.startDate,
                request.endDate,
            )
        ) {
            throw ConflictException("Employee has an overlapping active vacation")
        }
    }

    private fun findVacation(id: UUID): Vacation =
        vacationRepository.findById(id).orElseThrow { NotFoundException("Vacation not found") }

    private fun validate(vacation: Vacation) {
        if (vacation.startDate.isAfter(vacation.endDate)) {
            throw ConflictException("startDate must not be after endDate")
        }
        vacation.daysCount =
            ChronoUnit.DAYS.between(vacation.startDate, vacation.endDate).toInt() + 1
        if (vacation.daysCount <= 0) {
            throw ConflictException("daysCount must be positive")
        }
        if (vacation.tags.size > 20 || vacation.tags.any { it.isBlank() || it.length > 100 }) {
            throw ValidationException(
                "At most 20 nonblank tags, each at most 100 characters, are allowed",
            )
        }
        if (
            !vacation.archived &&
            vacation.status in ACTIVE_STATUSES &&
            vacationRepository.hasOverlappingVacation(
                requireNotNull(vacation.employee).id,
                vacation.id,
                ACTIVE_STATUSES,
                vacation.startDate,
                vacation.endDate,
            )
        ) {
            throw ConflictException("Employee has an overlapping active vacation")
        }
        vacation.priority =
            when {
                vacation.urgent || vacation.daysCount > 20 -> VacationPriority.HIGH
                vacation.daysCount <= 3 -> VacationPriority.LOW
                else -> VacationPriority.NORMAL
            }
    }

    private fun checkStatusTransition(
        vacation: Vacation,
        targetStatus: VacationStatus,
    ) {
        if (
            targetStatus == VacationStatus.APPROVED &&
            (
                vacation.archived ||
                    vacation.status in setOf(VacationStatus.REJECTED, VacationStatus.CANCELLED)
            )
        ) {
            throw ConflictException("Vacation cannot be approved")
        }
    }

    private fun requireTag(tag: String?): String =
        tag?.takeIf { it.isNotBlank() && it.length <= 100 }
            ?: throw ValidationException("A nonblank tag of at most 100 characters is required")

    companion object {
        private val ACTIVE_STATUSES =
            setOf(VacationStatus.DRAFT, VacationStatus.PENDING, VacationStatus.APPROVED)
    }
}
