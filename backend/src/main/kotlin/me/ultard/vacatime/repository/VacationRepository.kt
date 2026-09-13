package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.Vacation
import me.ultard.vacatime.domain.VacationStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
import java.util.UUID

interface VacationRepository :
    JpaRepository<Vacation, UUID>,
    JpaSpecificationExecutor<Vacation> {
    fun findByVacationNumber(vacationNumber: String): Vacation?

    @Query(
        """
        select count(vacation) > 0 from Vacation vacation
        where vacation.employee.id = :employeeId
          and vacation.id <> :excludedId
          and vacation.archived = false
          and vacation.status in :statuses
          and vacation.startDate <= :endDate
          and vacation.endDate >= :startDate
        """,
    )
    fun hasOverlappingVacation(
        employeeId: UUID,
        excludedId: UUID,
        statuses: Set<VacationStatus>,
        startDate: LocalDate,
        endDate: LocalDate,
    ): Boolean
}
