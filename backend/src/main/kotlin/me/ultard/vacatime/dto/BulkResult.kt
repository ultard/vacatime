package me.ultard.vacatime.dto

import java.util.UUID

data class BulkResult(
    val successfulIds: List<UUID>,
    val errors: Map<UUID, String>,
)
