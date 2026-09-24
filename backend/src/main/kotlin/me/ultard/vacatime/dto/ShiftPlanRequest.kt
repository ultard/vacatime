package me.ultard.vacatime.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.util.UUID

data class ShiftPlanRequest(
    @field:NotEmpty
    @field:Size(max = 366)
    val days: List<@Valid ShiftDayRequest>,
)

data class ShiftDayRequest(
    val date: LocalDate,
    val shifts: List<@Valid ShiftAssignmentRequest> = emptyList(),
)

data class ShiftAssignmentRequest(
    val shiftId: UUID,
    @field:Min(0)
    val minimumStaff: Int,
    val employeeIds: List<UUID> = emptyList(),
)
