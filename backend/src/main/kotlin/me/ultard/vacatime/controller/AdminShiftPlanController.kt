package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import me.ultard.vacatime.dto.ShiftPlanRequest
import me.ultard.vacatime.service.ShiftPlanService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin/shift-plans")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
class AdminShiftPlanController(
    private val shiftPlanService: ShiftPlanService,
) {
    @PutMapping
    fun replace(
        @Valid @RequestBody request: ShiftPlanRequest,
    ) = shiftPlanService.replace(request)
}
