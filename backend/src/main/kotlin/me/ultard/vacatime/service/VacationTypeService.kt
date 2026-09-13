package me.ultard.vacatime.service

import me.ultard.vacatime.domain.VacationType
import me.ultard.vacatime.dto.VacationTypeDto
import me.ultard.vacatime.dto.VacationTypeRequest
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.mapper.toDto
import me.ultard.vacatime.repository.VacationTypeRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class VacationTypeService(
    private val vacationTypeRepository: VacationTypeRepository,
    private val auditService: AuditService,
) {
    fun list(): List<VacationTypeDto> = vacationTypeRepository.findAll().map { it.toDto() }

    @Transactional
    fun create(request: VacationTypeRequest): VacationTypeDto {
        val vacationType =
            VacationType(
                code = request.code,
                name = request.name,
                description = request.description,
                active = request.active,
            )
        vacationTypeRepository.save(vacationType)
        auditService.log("CREATE", "VACATION_TYPE", vacationType.id)
        return vacationType.toDto()
    }

    @Transactional
    fun update(
        id: UUID,
        request: VacationTypeRequest,
    ): VacationTypeDto {
        val vacationType =
            vacationTypeRepository.findById(id).orElseThrow {
                NotFoundException("Vacation type not found")
            }
        vacationType.code = request.code
        vacationType.name = request.name
        vacationType.description = request.description
        vacationType.active = request.active
        auditService.log("UPDATE", "VACATION_TYPE", id)
        return vacationType.toDto()
    }
}
