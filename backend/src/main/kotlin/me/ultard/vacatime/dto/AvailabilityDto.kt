package me.ultard.vacatime.dto

import java.time.LocalDate
import java.util.UUID

data class AvailabilityDto(
    val from: LocalDate,
    val to: LocalDate,
    val departments: List<DepartmentAvailabilityDto>,
)

data class DepartmentAvailabilityDto(
    val id: UUID,
    val name: String,
    val shifts: List<ShiftAvailabilityDto>,
)

data class ShiftAvailabilityDto(
    val id: UUID,
    val name: String,
    val days: List<ShiftDayAvailabilityDto>,
)

data class ShiftDayAvailabilityDto(
    val date: LocalDate,
    val planned: Boolean,
    val minimumStaff: Int?,
    val scheduledStaff: Int?,
    val approvedAbsent: Int?,
    val pendingAbsent: Int?,
    val availableAfterApproved: Int?,
    val forecastAvailable: Int?,
    val confirmedShortage: Boolean?,
    val forecastShortage: Boolean?,
)
