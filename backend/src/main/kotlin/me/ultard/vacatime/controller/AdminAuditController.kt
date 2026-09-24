package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import me.ultard.vacatime.dto.AuditLogDto
import me.ultard.vacatime.dto.PageResponse
import me.ultard.vacatime.service.AuditService
import org.springframework.data.domain.Sort
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
class AdminAuditController(
    private val auditService: AuditService,
) {
    @GetMapping
    fun list(
        @RequestParam(required = false) search: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(defaultValue = "createdAt") sort: String,
        @RequestParam(defaultValue = "DESC") direction: Sort.Direction,
    ): PageResponse<AuditLogDto> = auditService.list(search, page, size, sort, direction)
}
