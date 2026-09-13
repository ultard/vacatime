package me.ultard.vacatime.mapper

import me.ultard.vacatime.domain.User
import me.ultard.vacatime.dto.UserDto

fun User.toDto() = UserDto(id, login, fullName, roles.toSet(), active, mustChangePassword)
