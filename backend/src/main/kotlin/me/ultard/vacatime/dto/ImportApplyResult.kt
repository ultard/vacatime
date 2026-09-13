package me.ultard.vacatime.dto

import java.util.UUID

data class ImportApplyResult(
    val successfulIds: List<UUID>,
    val errors: Map<Int, String>,
)
