package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import me.ultard.vacatime.dto.PageResponse
import me.ultard.vacatime.dto.ResetPasswordRequest
import me.ultard.vacatime.dto.UserDto
import me.ultard.vacatime.dto.UserRequest
import me.ultard.vacatime.service.UserService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
class AdminUserController(
    private val userService: UserService,
) {
    @GetMapping
    fun list(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<UserDto> = userService.list(page, size)

    @PostMapping
    fun create(
        @Valid @RequestBody request: UserRequest,
    ): UserDto = userService.create(request)

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UserRequest,
    ): UserDto = userService.update(id, request)

    @PostMapping("/{id}/reset-password")
    fun resetPassword(
        @PathVariable id: UUID,
        @Valid @RequestBody request: ResetPasswordRequest,
    ) = userService.resetPassword(id, request.temporaryPassword)
}
