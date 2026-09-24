package me.ultard.vacatime.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ShiftRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    val active: Boolean = true,
)
