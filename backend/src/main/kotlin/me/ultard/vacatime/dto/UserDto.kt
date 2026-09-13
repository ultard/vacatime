package me.ultard.vacatime.dto

import me.ultard.vacatime.domain.Role
import java.util.UUID

data class UserDto(
    val id: UUID,
    val login: String,
    val fullName: String,
    val roles: Set<Role>,
    val active: Boolean,
    val mustChangePassword: Boolean,
)
