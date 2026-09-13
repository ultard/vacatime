package me.ultard.vacatime.mapper

import me.ultard.vacatime.domain.Vacation
import me.ultard.vacatime.dto.VacationDto

fun Vacation.toDto() =
    VacationDto(
        id,
        vacationNumber,
        employee!!.toDto(),
        vacationType!!.toDto(),
        title,
        description,
        startDate,
        endDate,
        daysCount,
        status,
        urgent,
        tags.toSet(),
        priority,
        version,
        archived,
    )
