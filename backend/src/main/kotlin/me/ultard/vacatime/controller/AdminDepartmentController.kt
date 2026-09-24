package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import me.ultard.vacatime.dto.DepartmentDto
import me.ultard.vacatime.dto.DepartmentRequest
import me.ultard.vacatime.dto.ShiftDto
import me.ultard.vacatime.dto.ShiftRequest
import me.ultard.vacatime.service.DepartmentService
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
@RequestMapping("/api/admin/departments")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
class AdminDepartmentController(
    private val departmentService: DepartmentService,
) {
    @GetMapping
    fun list(): List<DepartmentDto> = departmentService.list(includeInactive = true)

    @PostMapping
    fun create(
        @Valid @RequestBody request: DepartmentRequest,
    ): DepartmentDto = departmentService.create(request)

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: DepartmentRequest,
    ): DepartmentDto = departmentService.update(id, request)

    @PostMapping("/{departmentId}/shifts")
    fun createShift(
        @PathVariable departmentId: UUID,
        @Valid @RequestBody request: ShiftRequest,
    ): ShiftDto = departmentService.createShift(departmentId, request)

    @PutMapping("/{departmentId}/shifts/{id}")
    fun updateShift(
        @PathVariable departmentId: UUID,
        @PathVariable id: UUID,
        @Valid @RequestBody request: ShiftRequest,
    ): ShiftDto = departmentService.updateShift(departmentId, id, request)
}
