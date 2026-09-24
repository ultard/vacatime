package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import me.ultard.vacatime.dto.BulkRequest
import me.ultard.vacatime.dto.BulkResult
import me.ultard.vacatime.dto.PageResponse
import me.ultard.vacatime.dto.VacationDto
import me.ultard.vacatime.dto.VacationFilter
import me.ultard.vacatime.dto.VacationRequest
import me.ultard.vacatime.service.VacationBulkService
import me.ultard.vacatime.service.VacationService
import org.springframework.data.domain.Sort
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/vacations")
@SecurityRequirement(name = "bearerAuth")
class VacationController(
    private val vacationService: VacationService,
    private val vacationBulkService: VacationBulkService,
) {
    @GetMapping
    fun list(
        @ModelAttribute filter: VacationFilter,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(defaultValue = "createdAt") sort: String,
        @RequestParam(defaultValue = "DESC") direction: Sort.Direction,
    ): PageResponse<VacationDto> = vacationService.list(filter, page, size, sort, direction)

    @GetMapping("/{id}")
    fun get(
        @PathVariable id: UUID,
    ): VacationDto = vacationService.get(id)

    @PostMapping
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun create(
        @Valid @RequestBody request: VacationRequest,
    ): VacationDto = vacationService.create(request)

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: VacationRequest,
    ): VacationDto = vacationService.update(id, request)

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun archive(
        @PathVariable id: UUID,
    ) = vacationService.archive(id)

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun restore(
        @PathVariable id: UUID,
    ) = vacationService.restore(id)

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('ADMIN')")
    fun permanentDelete(
        @PathVariable id: UUID,
    ) = vacationService.permanentDelete(id)

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun bulk(
        @Valid @RequestBody request: BulkRequest,
    ): BulkResult = vacationBulkService.apply(request)
}
