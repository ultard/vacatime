package me.ultard.vacatime.service

import me.ultard.vacatime.domain.Department
import me.ultard.vacatime.domain.Shift
import me.ultard.vacatime.dto.DepartmentDto
import me.ultard.vacatime.dto.DepartmentRequest
import me.ultard.vacatime.dto.ShiftDto
import me.ultard.vacatime.dto.ShiftRequest
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.repository.DepartmentRepository
import me.ultard.vacatime.repository.ShiftRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
@Transactional(readOnly = true)
class DepartmentService(
    private val departmentRepository: DepartmentRepository,
    private val shiftRepository: ShiftRepository,
    private val auditService: AuditService,
) {
    fun list(includeInactive: Boolean = false): List<DepartmentDto> {
        val departments =
            if (includeInactive) {
                departmentRepository.findAllByOrderByName()
            } else {
                departmentRepository.findAllByActiveTrueOrderByName()
            }
        val shifts =
            if (includeInactive) {
                shiftRepository.findAllByOrderByDepartmentNameAscNameAsc()
            } else {
                shiftRepository.findAllByActiveTrueAndDepartmentActiveTrueOrderByDepartmentNameAscNameAsc()
            }
        val shiftsByDepartment = shifts.groupBy { requireNotNull(it.department).id }
        return departments.map { department ->
            department.toDto(shiftsByDepartment[department.id].orEmpty())
        }
    }

    @Transactional
    fun create(request: DepartmentRequest): DepartmentDto {
        val department = departmentRepository.save(Department(name = request.name, active = request.active))
        auditService.log("CREATE", "DEPARTMENT", department.id)
        return department.toDto(emptyList())
    }

    @Transactional
    fun update(
        id: UUID,
        request: DepartmentRequest,
    ): DepartmentDto {
        val department = findDepartment(id)
        department.name = request.name
        department.active = request.active
        department.updatedAt = Instant.now()
        auditService.log("UPDATE", "DEPARTMENT", id)
        return department.toDto(shiftRepository.findAllByDepartmentIdOrderByName(id))
    }

    @Transactional
    fun createShift(
        departmentId: UUID,
        request: ShiftRequest,
    ): ShiftDto {
        val department = findDepartment(departmentId)
        val shift = shiftRepository.save(Shift(department = department, name = request.name, active = request.active))
        auditService.log("CREATE", "SHIFT", shift.id)
        return shift.toDto()
    }

    @Transactional
    fun updateShift(
        departmentId: UUID,
        id: UUID,
        request: ShiftRequest,
    ): ShiftDto {
        val shift =
            shiftRepository.findByIdAndDepartmentId(id, departmentId)
                ?: throw NotFoundException("Shift not found")
        shift.name = request.name
        shift.active = request.active
        shift.updatedAt = Instant.now()
        auditService.log("UPDATE", "SHIFT", id)
        return shift.toDto()
    }

    private fun findDepartment(id: UUID): Department =
        departmentRepository.findById(id).orElseThrow { NotFoundException("Department not found") }
}

private fun Department.toDto(shifts: List<Shift>) =
    DepartmentDto(id, name, active, shifts.map { it.toDto() })

private fun Shift.toDto() = ShiftDto(id, name, active)
