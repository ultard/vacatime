package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import me.ultard.vacatime.domain.User
import me.ultard.vacatime.dto.LoginRequest
import me.ultard.vacatime.dto.PasswordRequest
import me.ultard.vacatime.dto.RefreshRequest
import me.ultard.vacatime.dto.TokenResponse
import me.ultard.vacatime.dto.UserDto
import me.ultard.vacatime.mapper.toDto
import me.ultard.vacatime.service.AuthService
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
) {
    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
    ): TokenResponse = authService.login(request)

    @PostMapping("/refresh")
    fun refresh(
        @Valid @RequestBody request: RefreshRequest,
    ): TokenResponse = authService.refresh(request)

    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    fun logout(
        @AuthenticationPrincipal user: User,
        @Valid @RequestBody request: RefreshRequest,
    ) = authService.logout(user, request)

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    fun me(
        @AuthenticationPrincipal user: User,
    ): UserDto = user.toDto()

    @PostMapping("/change-password")
    @SecurityRequirement(name = "bearerAuth")
    fun changePassword(
        @AuthenticationPrincipal user: User,
        @Valid @RequestBody request: PasswordRequest,
    ) = authService.changePassword(user.id, request)
}
