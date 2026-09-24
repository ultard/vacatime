package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.Shift
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface ShiftRepository : JpaRepository<Shift, UUID> {
    @EntityGraph(attributePaths = ["department"])
    @Query(
        "select shift from Shift shift where shift.active = true and shift.department.active = true order by shift.department.name, shift.name",
    )
    fun findActiveForAvailability(): List<Shift>

    fun findAllByOrderByDepartmentNameAscNameAsc(): List<Shift>

    @Query(
        "select shift from Shift shift where shift.department.id = :departmentId order by shift.name",
    )
    fun findAllForDepartment(
        @Param("departmentId") departmentId: UUID,
    ): List<Shift>

    @Query(
        "select shift from Shift shift where shift.id = :id and shift.department.id = :departmentId",
    )
    fun findByIdAndDepartment(
        @Param("id") id: UUID,
        @Param("departmentId") departmentId: UUID,
    ): Shift?
}
