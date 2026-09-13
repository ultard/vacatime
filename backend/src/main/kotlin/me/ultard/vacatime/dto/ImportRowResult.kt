package me.ultard.vacatime.dto

data class ImportRowResult(
    val rowNumber: Int,
    val vacationNumber: String?,
    val request: VacationRequest?,
    val error: String?,
)
