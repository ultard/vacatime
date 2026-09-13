package me.ultard.vacatime.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ImportRequest(
    @field:NotBlank
    @field:Size(max = 2_000_000)
    val csv: String,
    val mode: ImportMode = ImportMode.CREATE_ONLY,
)
