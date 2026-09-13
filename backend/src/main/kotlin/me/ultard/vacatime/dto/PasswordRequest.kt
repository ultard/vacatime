package me.ultard.vacatime.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class PasswordRequest(
    @field:NotBlank
    @field:Size(max = 72)
    val oldPassword: String,
    @field:NotBlank
    @field:Size(min = 8, max = 72)
    val newPassword: String,
)
