package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.ShiftPlan
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.util.UUID

interface ShiftPlanRepository : JpaRepository<ShiftPlan, UUID> {
    @Modifying
    @Query("delete from ShiftPlan plan where plan.workDate in :dates")
    fun deleteAllByWorkDateIn(@Param("dates") dates: Set<LocalDate>)

    @EntityGraph(attributePaths = ["shift", "shift.department", "assignments", "assignments.employee"])
    fun findAllByWorkDateBetweenAndShiftActiveTrueAndShiftDepartmentActiveTrueOrderByWorkDateAsc(
        start: LocalDate,
        end: LocalDate,
    ): List<ShiftPlan>
}
