package me.ultard.vacatime.service

import me.ultard.vacatime.domain.User
import me.ultard.vacatime.dto.PageResponse
import me.ultard.vacatime.dto.UserDto
import me.ultard.vacatime.dto.UserRequest
import me.ultard.vacatime.error.ConflictException
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.mapper.toDto
import me.ultard.vacatime.repository.RefreshSessionRepository
import me.ultard.vacatime.repository.UserRepository
import org.springframework.data.domain.PageRequest
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
@Transactional(readOnly = true)
class UserService(
    private val userRepository: UserRepository,
    private val refreshSessionRepository: RefreshSessionRepository,
    private val passwordEncoder: PasswordEncoder,
    private val auditService: AuditService,
) {
    fun list(
        page: Int,
        size: Int,
    ): PageResponse<UserDto> {
        val users = userRepository.findAll(PageRequest.of(page, size.coerceIn(1, 100)))
        return PageResponse(
            content = users.content.map { it.toDto() },
            page = users.number,
            size = users.size,
            totalElements = users.totalElements,
            totalPages = users.totalPages,
        )
    }

    @Transactional
    fun create(request: UserRequest): UserDto {
        requireUniqueLogin(request.login)
        val password =
            request.temporaryPassword
                ?: throw ConflictException("A temporary password is required when creating a user")
        val user =
            User(
                login = request.login,
                fullName = request.fullName,
                roles = request.roles.toMutableSet(),
                active = request.active,
                passwordHash = requireNotNull(passwordEncoder.encode(password)),
                mustChangePassword = true,
            )
        userRepository.save(user)
        auditService.log("CREATE", "USER", user.id)
        return user.toDto()
    }

    @Transactional
    fun update(
        id: UUID,
        request: UserRequest,
    ): UserDto {
        requireUniqueLogin(request.login, id)
        val user = findUser(id)
        user.login = request.login
        user.fullName = request.fullName
        user.roles = request.roles.toMutableSet()
        user.active = request.active
        user.updatedAt = Instant.now()
        if (!user.active) {
            refreshSessionRepository.revokeAllByUserId(id)
        }
        auditService.log("UPDATE", "USER", id)
        return user.toDto()
    }

    @Transactional
    fun resetPassword(
        id: UUID,
        temporaryPassword: String,
    ) {
        val user = findUser(id)
        user.passwordHash = requireNotNull(passwordEncoder.encode(temporaryPassword))
        user.mustChangePassword = true
        user.failedLoginAttempts = 0
        user.lockedUntil = null
        user.updatedAt = Instant.now()
        refreshSessionRepository.revokeAllByUserId(id)
        auditService.log("RESET_PASSWORD", "USER", id)
    }

    private fun findUser(id: UUID): User =
        userRepository.findById(id).orElseThrow { NotFoundException("User not found") }

    private fun requireUniqueLogin(
        login: String,
        currentUserId: UUID? = null,
    ) {
        val existingUser = userRepository.findByLogin(login)
        if (existingUser != null && existingUser.id != currentUserId) {
            throw ConflictException("Login already exists")
        }
    }
}
