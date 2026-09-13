package me.ultard.vacatime.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "audit_log")
class AuditLog(
    @Id
    var id: UUID = UUID.randomUUID(),
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    var user: User? = null,
    @Column(name = "event_type")
    var eventType: String = "",
    @Column(name = "entity_type")
    var entityType: String = "",
    @Column(name = "entity_id")
    var entityId: UUID? = null,
    @Column(name = "correlation_id")
    var correlationId: String = "",
    var description: String = "",
    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),
)
