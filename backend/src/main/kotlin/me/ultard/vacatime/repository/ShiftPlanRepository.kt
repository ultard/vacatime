package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.ShiftPlan
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.util.UUID

interface ShiftPlanRepository : JpaRepository<ShiftPlan, UUID> {
    @Modifying
    @Query("delete from ShiftPlan plan where plan.workDate in :dates")
    fun deleteAllByWorkDateIn(
        @Param("dates") dates: Set<LocalDate>,
    )

    @Query(
        """
        select distinct plan from ShiftPlan plan
        join fetch plan.shift shift
        join fetch shift.department department
        left join fetch plan.assignments assignment
        left join fetch assignment.employee
        where plan.workDate between :start and :end
          and shift.active = true
          and department.active = true
          and (:departmentId is null or department.id = :departmentId)
        order by plan.workDate asc
        """,
    )
    fun findAvailabilityPlans(
        @Param("start") start: LocalDate,
        @Param("end") end: LocalDate,
        @Param("departmentId") departmentId: UUID?,
    ): List<ShiftPlan>
}
