package me.ultard.vacatime.error

import java.time.Instant

data class ApiError(
    val timestamp: Instant = Instant.now(),
    val status: Int,
    val error: String,
    val message: String,
    val path: String,
    val correlationId: String?,
    val fieldErrors: Map<String, String> = emptyMap(),
)
