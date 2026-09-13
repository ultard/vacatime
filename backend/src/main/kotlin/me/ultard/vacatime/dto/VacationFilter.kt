package me.ultard.vacatime.dto

import me.ultard.vacatime.domain.VacationPriority
import me.ultard.vacatime.domain.VacationStatus
import java.time.LocalDate
import java.util.UUID

data class VacationFilter(
    val search: String? = null,
    val employeeId: UUID? = null,
    val vacationTypeId: UUID? = null,
    val status: VacationStatus? = null,
    val urgent: Boolean? = null,
    val priority: VacationPriority? = null,
    val tag: String? = null,
    val archived: Boolean? = null,
    val startDateFrom: LocalDate? = null,
    val startDateTo: LocalDate? = null,
    val daysCount: Int? = null,
    val daysCountOperator: ComparisonOperator = ComparisonOperator.EQ,
)
