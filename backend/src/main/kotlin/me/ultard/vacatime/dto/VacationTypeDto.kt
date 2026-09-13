package me.ultard.vacatime.dto

import java.util.UUID

data class VacationTypeDto(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val active: Boolean,
)
