package me.ultard.vacatime.dto

import java.time.Instant
import java.util.UUID

data class AuditLogDto(
    val id: UUID,
    val userId: UUID?,
    val eventType: String,
    val entityType: String,
    val entityId: UUID?,
    val correlationId: String,
    val description: String,
    val createdAt: Instant,
)
