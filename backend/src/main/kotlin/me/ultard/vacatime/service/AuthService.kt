package me.ultard.vacatime.service

import me.ultard.vacatime.domain.RefreshSession
import me.ultard.vacatime.domain.User
import me.ultard.vacatime.dto.LoginRequest
import me.ultard.vacatime.dto.PasswordRequest
import me.ultard.vacatime.dto.RefreshRequest
import me.ultard.vacatime.dto.TokenResponse
import me.ultard.vacatime.error.ForbiddenOperationException
import me.ultard.vacatime.error.UnauthorizedException
import me.ultard.vacatime.repository.RefreshSessionRepository
import me.ultard.vacatime.repository.UserRepository
import me.ultard.vacatime.security.JwtService
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val refreshSessionRepository: RefreshSessionRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
    private val auditService: AuditService,
    @Value("\${app.jwt.refresh-days}") private val refreshDays: Long,
    @Value("\${app.security.max-failed-attempts}") private val maxFailedAttempts: Int,
    @Value("\${app.security.lock-minutes}") private val lockMinutes: Long,
) {
    @Transactional(noRollbackFor = [UnauthorizedException::class])
    fun login(request: LoginRequest): TokenResponse {
        val user =
            userRepository.findByLoginForUpdate(request.login)
                ?: throw UnauthorizedException("Invalid credentials")

        if (!user.active) {
            throw UnauthorizedException("User is disabled")
        }
        if (user.lockedUntil?.isAfter(Instant.now()) == true) {
            throw UnauthorizedException("Account is temporarily locked")
        }
        if (!passwordEncoder.matches(request.password, user.passwordHash)) {
            user.failedLoginAttempts++
            if (user.failedLoginAttempts >= maxFailedAttempts) {
                user.lockedUntil = Instant.now().plus(Duration.ofMinutes(lockMinutes))
                user.failedLoginAttempts = 0
            }
            auditService.log("LOGIN_FAILED", "USER", user.id, actor = user)
            throw UnauthorizedException("Invalid credentials")
        }

        user.failedLoginAttempts = 0
        user.lockedUntil = null
        user.updatedAt = Instant.now()
        auditService.log("LOGIN", "USER", user.id, actor = user)
        return issueTokens(user)
    }

    @Transactional
    fun refresh(request: RefreshRequest): TokenResponse {
        val session = findRefreshSession(request.refreshToken)
        val user = requireNotNull(session.user)
        if (!user.active || user.lockedUntil?.isAfter(Instant.now()) == true) {
            throw UnauthorizedException("Account is unavailable")
        }
        session.revoked = true
        return issueTokens(user)
    }

    @Transactional
    fun logout(
        user: User,
        request: RefreshRequest,
    ) {
        val session = findRefreshSession(request.refreshToken)
        if (session.user?.id != user.id) {
            throw ForbiddenOperationException("Refresh session belongs to another user")
        }
        session.revoked = true
        auditService.log("LOGOUT", "USER", user.id)
    }

    @Transactional
    fun changePassword(
        userId: UUID,
        request: PasswordRequest,
    ) {
        val user =
            userRepository.findByIdForUpdate(userId)
                ?: throw UnauthorizedException("User not found")
        if (!passwordEncoder.matches(request.oldPassword, user.passwordHash)) {
            throw UnauthorizedException("Invalid password")
        }
        if (request.oldPassword == request.newPassword) {
            throw ForbiddenOperationException("New password must differ from the old password")
        }
        user.passwordHash = requireNotNull(passwordEncoder.encode(request.newPassword))
        user.mustChangePassword = false
        user.updatedAt = Instant.now()
        refreshSessionRepository.revokeAllByUserId(userId)
        auditService.log("CHANGE_PASSWORD", "USER", userId)
    }

    private fun findRefreshSession(token: String): RefreshSession {
        val session =
            refreshSessionRepository.findByTokenHashAndRevokedFalse(hash(token))
                ?: throw UnauthorizedException("Invalid refresh token")
        if (!session.expiresAt.isAfter(Instant.now())) {
            throw UnauthorizedException("Expired refresh token")
        }
        return session
    }

    private fun issueTokens(user: User): TokenResponse {
        val rawToken = UUID.randomUUID().toString() + UUID.randomUUID()
        refreshSessionRepository.save(
            RefreshSession(
                user = user,
                tokenHash = hash(rawToken),
                expiresAt = Instant.now().plus(Duration.ofDays(refreshDays)),
            ),
        )
        return TokenResponse(
            accessToken = jwtService.create(user),
            refreshToken = rawToken,
            mustChangePassword = user.mustChangePassword,
        )
    }

    private fun hash(token: String): String =
        MessageDigest
            .getInstance("SHA-256")
            .digest(token.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
}
