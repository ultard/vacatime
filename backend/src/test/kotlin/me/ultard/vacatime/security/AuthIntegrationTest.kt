package me.ultard.vacatime.security

import me.ultard.vacatime.dto.LoginRequest
import me.ultard.vacatime.dto.PasswordRequest
import me.ultard.vacatime.dto.RefreshRequest
import me.ultard.vacatime.dto.TokenResponse
import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class AuthIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `login issues tokens and exposes no password fields`() {
        val user = createUser()
        val tokens = login(user)
        mockMvc
            .perform(get("/api/auth/me").header("Authorization", "Bearer ${tokens.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.login").value(user.login))
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andExpect(jsonPath("$.password").doesNotExist())
    }

    @Test
    fun `refresh token rotates and cannot be reused`() {
        val user = createUser()
        val tokens = login(user)
        val rotated =
            response<TokenResponse>(
                postJson("/api/auth/refresh", RefreshRequest(tokens.refreshToken))
                    .andExpect(status().isOk),
            )
        postJson("/api/auth/refresh", RefreshRequest(tokens.refreshToken))
            .andExpect(status().isUnauthorized)
        postJson("/api/auth/refresh", RefreshRequest(rotated.refreshToken)).andExpect(status().isOk)
    }

    @Test
    fun `logout revokes refresh session`() {
        val user = createUser()
        val tokens = login(user)
        postJson("/api/auth/logout", RefreshRequest(tokens.refreshToken), user)
            .andExpect(status().isOk)
        postJson("/api/auth/refresh", RefreshRequest(tokens.refreshToken))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `disabled user cannot log in or refresh`() {
        val user = createUser()
        val tokens = login(user)
        user.active = false
        userRepository.saveAndFlush(user)
        postJson("/api/auth/login", LoginRequest(user.login, PASSWORD))
            .andExpect(status().isUnauthorized)
        postJson("/api/auth/refresh", RefreshRequest(tokens.refreshToken))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `failed login attempts persist and temporarily lock the account`() {
        val user = createUser()
        repeat(5) {
            postJson("/api/auth/login", LoginRequest(user.login, "IncorrectPassword"))
                .andExpect(status().isUnauthorized)
        }
        assertNotNull(userRepository.findById(user.id).orElseThrow().lockedUntil)
        postJson("/api/auth/login", LoginRequest(user.login, PASSWORD))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `temporary password restricts business endpoints until changed`() {
        val user = createUser(mustChangePassword = true)
        val tokens = login(user)
        mockMvc
            .perform(get("/api/vacations").header("Authorization", "Bearer ${tokens.accessToken}"))
            .andExpect(status().isForbidden)
        postJson("/api/auth/change-password", PasswordRequest(PASSWORD, "NewPassword123!"), user)
            .andExpect(status().isOk)
        postJson("/api/auth/refresh", RefreshRequest(tokens.refreshToken))
            .andExpect(status().isUnauthorized)
        postJson("/api/auth/login", LoginRequest(user.login, "NewPassword123!"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.mustChangePassword").value(false))
    }

    @Test
    fun `missing and malformed JWT return a correlated JSON error`() {
        mockMvc
            .perform(get("/api/vacations").header("X-Correlation-ID", "test-correlation"))
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.correlationId").value("test-correlation"))
        mockMvc
            .perform(get("/api/vacations").header("Authorization", "Bearer invalid"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `malformed JSON returns validation error instead of stack trace`() {
        mockMvc
            .perform(post("/api/auth/login").contentType("application/json").content("{broken"))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.trace").doesNotExist())
    }
}
