package me.ultard.vacatime.dto

import me.ultard.vacatime.domain.VacationPriority
import me.ultard.vacatime.domain.VacationStatus
import java.time.LocalDate
import java.util.UUID

data class VacationDto(
    val id: UUID,
    val vacationNumber: String,
    val employee: UserDto,
    val vacationType: VacationTypeDto,
    val title: String,
    val description: String?,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val daysCount: Int,
    val status: VacationStatus,
    val urgent: Boolean,
    val tags: Set<String>,
    val priority: VacationPriority,
    val version: Long?,
    val archived: Boolean,
)
