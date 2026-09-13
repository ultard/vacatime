package me.ultard.vacatime.dto

data class ImportPreviewResult(
    val validRows: List<ImportRowResult>,
    val invalidRows: List<ImportRowResult>,
)
