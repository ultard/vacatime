package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import me.ultard.vacatime.dto.DepartmentDto
import me.ultard.vacatime.service.DepartmentService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/departments")
@SecurityRequirement(name = "bearerAuth")
class DepartmentController(
    private val departmentService: DepartmentService,
) {
    @GetMapping
    fun list(): List<DepartmentDto> = departmentService.list()
}
