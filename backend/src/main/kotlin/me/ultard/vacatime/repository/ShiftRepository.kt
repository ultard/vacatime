package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.Shift
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ShiftRepository : JpaRepository<Shift, UUID> {
    fun findAllByActiveTrueAndDepartmentActiveTrueOrderByDepartmentNameAscNameAsc(): List<Shift>

    fun findAllByOrderByDepartmentNameAscNameAsc(): List<Shift>

    fun findAllByDepartmentIdOrderByName(departmentId: UUID): List<Shift>

    fun findByIdAndDepartmentId(id: UUID, departmentId: UUID): Shift?
}
