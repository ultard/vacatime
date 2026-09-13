package me.ultard.vacatime.repository

import jakarta.persistence.LockModeType
import me.ultard.vacatime.domain.RefreshSession
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface RefreshSessionRepository : JpaRepository<RefreshSession, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findByTokenHashAndRevokedFalse(tokenHash: String): RefreshSession?

    @Modifying
    @Query(
        "update RefreshSession session set session.revoked = true where session.user.id = :userId",
    )
    fun revokeAllByUserId(userId: UUID): Int
}
