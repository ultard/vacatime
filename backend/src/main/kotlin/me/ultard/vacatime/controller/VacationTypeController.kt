package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import me.ultard.vacatime.dto.VacationTypeDto
import me.ultard.vacatime.dto.VacationTypeRequest
import me.ultard.vacatime.service.VacationTypeService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/vacation-types")
@SecurityRequirement(name = "bearerAuth")
class VacationTypeController(
    private val vacationTypeService: VacationTypeService,
) {
    @GetMapping
    fun list(): List<VacationTypeDto> = vacationTypeService.list()

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    fun create(
        @Valid @RequestBody request: VacationTypeRequest,
    ): VacationTypeDto = vacationTypeService.create(request)

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: VacationTypeRequest,
    ): VacationTypeDto = vacationTypeService.update(id, request)
}
