package me.ultard.vacatime.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class VacationTypeRequest(
    @field:NotBlank
    @field:Size(max = 50)
    val code: String,
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    @field:Size(max = 1000)
    val description: String? = null,
    val active: Boolean = true,
)
