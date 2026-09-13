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
@Table(name = "refresh_sessions")
class RefreshSession(
    @Id
    var id: UUID = UUID.randomUUID(),
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    var user: User? = null,
    @Column(name = "token_hash", unique = true)
    var tokenHash: String = "",
    @Column(name = "expires_at")
    var expiresAt: Instant = Instant.now(),
    var revoked: Boolean = false,
    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),
)
