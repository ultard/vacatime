package me.ultard.vacatime.service

import me.ultard.vacatime.domain.AuditLog
import me.ultard.vacatime.domain.User
import me.ultard.vacatime.dto.AuditLogDto
import me.ultard.vacatime.dto.PageResponse
import me.ultard.vacatime.error.ValidationException
import me.ultard.vacatime.repository.AuditLogRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.context.request.RequestContextHolder
import org.springframework.web.context.request.ServletRequestAttributes
import java.util.UUID

@Service
class AuditService(
    private val auditLogRepository: AuditLogRepository,
) {
    @Transactional
    fun log(
        eventType: String,
        entityType: String,
        entityId: UUID?,
        description: String = "",
        actor: User? = SecurityContextHolder.getContext().authentication?.principal as? User,
    ) {
        val request =
            (RequestContextHolder.getRequestAttributes() as? ServletRequestAttributes)?.request
        auditLogRepository.save(
            AuditLog(
                user = actor,
                eventType = eventType,
                entityType = entityType,
                entityId = entityId,
                correlationId =
                    request?.getAttribute("correlationId") as? String
                        ?: UUID.randomUUID().toString(),
                description = description,
            ),
        )
    }

    @Transactional(readOnly = true)
    fun list(
        search: String?,
        page: Int,
        size: Int,
        sort: String,
        direction: Sort.Direction,
    ): PageResponse<AuditLogDto> {
        if (page < 0 || sort !in setOf("createdAt", "eventType", "entityType")) {
            throw ValidationException("Invalid pagination or audit sort field")
        }
        val specification =
            Specification<AuditLog> { root, _, criteria ->
                if (search.isNullOrBlank()) {
                    criteria.conjunction()
                } else {
                    val pattern = "%${search.lowercase()}%"
                    criteria.or(
                        criteria.like(criteria.lower(root.get("description")), pattern),
                        criteria.like(criteria.lower(root.get("eventType")), pattern),
                        criteria.like(criteria.lower(root.get("entityType")), pattern),
                        criteria.like(criteria.lower(root.get("correlationId")), pattern),
                    )
                }
            }
        val result =
            auditLogRepository.findAll(
                specification,
                PageRequest.of(page, size.coerceIn(1, 100), Sort.by(direction, sort)),
            )
        return PageResponse(
            content =
                result.content.map {
                    AuditLogDto(
                        it.id,
                        it.user?.id,
                        it.eventType,
                        it.entityType,
                        it.entityId,
                        it.correlationId,
                        it.description,
                        it.createdAt,
                    )
                },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
        )
    }
}
