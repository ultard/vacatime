package me.ultard.vacatime.mapper

import me.ultard.vacatime.domain.VacationType
import me.ultard.vacatime.dto.VacationTypeDto

fun VacationType.toDto() = VacationTypeDto(id, code, name, description, active)
