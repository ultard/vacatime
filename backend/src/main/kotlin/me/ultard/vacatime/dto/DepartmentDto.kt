package me.ultard.vacatime.dto

import java.util.UUID

data class DepartmentDto(
    val id: UUID,
    val name: String,
    val active: Boolean,
    val shifts: List<ShiftDto>,
)

data class ShiftDto(
    val id: UUID,
    val name: String,
    val active: Boolean,
)
