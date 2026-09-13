package me.ultard.vacatime.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size
import me.ultard.vacatime.domain.Role

data class UserRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val login: String,
    @field:NotBlank
    @field:Size(max = 255)
    val fullName: String,
    @field:NotEmpty
    val roles: Set<Role> = setOf(Role.VIEWER),
    val active: Boolean = true,
    @field:Size(min = 8, max = 72)
    val temporaryPassword: String? = null,
)
