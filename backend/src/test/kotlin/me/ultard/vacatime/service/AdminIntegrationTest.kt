package me.ultard.vacatime.service

import me.ultard.vacatime.domain.Role
import me.ultard.vacatime.dto.LoginRequest
import me.ultard.vacatime.dto.RefreshRequest
import me.ultard.vacatime.dto.ResetPasswordRequest
import me.ultard.vacatime.dto.UserDto
import me.ultard.vacatime.dto.UserRequest
import me.ultard.vacatime.dto.VacationTypeDto
import me.ultard.vacatime.dto.VacationTypeRequest
import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.util.UUID

class AdminIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `admin creates user with temporary password and reset revokes refresh`() {
        val admin = createUser(Role.ADMIN)
        val user =
            response<UserDto>(
                postJson(
                    "/api/admin/users",
                    UserRequest(
                        "created-${UUID.randomUUID()}",
                        "Created Employee",
                        temporaryPassword = PASSWORD,
                    ),
                    admin,
                ).andExpect(status().isOk)
                    .andExpect(jsonPath("$.mustChangePassword").value(true)),
            )
        val storedUser = userRepository.findById(user.id).orElseThrow()
        val tokens = login(storedUser)
        postJson(
            "/api/admin/users/${user.id}/reset-password",
            ResetPasswordRequest("ResetPassword123!"),
            admin,
        ).andExpect(status().isOk)
        postJson("/api/auth/refresh", RefreshRequest(tokens.refreshToken))
            .andExpect(status().isUnauthorized)
        postJson("/api/auth/login", LoginRequest(user.login, "ResetPassword123!"))
            .andExpect(status().isOk)
    }

    @Test
    fun `inactive vacation type cannot be used for new vacations`() {
        val admin = createUser(Role.ADMIN)
        val editor = createUser()
        val vacationType =
            response<VacationTypeDto>(
                postJson(
                    "/api/vacation-types",
                    VacationTypeRequest(
                        "INACTIVE-${UUID.randomUUID()}",
                        "Inactive-${UUID.randomUUID()}",
                        null,
                        false,
                    ),
                    admin,
                ).andExpect(status().isOk),
            )
        postJson(
            "/api/vacations",
            vacationRequest(editor).copy(vacationTypeId = vacationType.id),
            editor,
        ).andExpect(status().isConflict)
        postJson("/api/vacation-types", VacationTypeRequest("FORBIDDEN", "Forbidden", null), editor)
            .andExpect(status().isForbidden)
    }

    @Test
    fun `audit search preserves correlation and requires admin`() {
        val admin = createUser(Role.ADMIN)
        val editor = createUser()
        mockMvc
            .perform(
                post("/api/auth/login")
                    .header("X-Correlation-ID", "audit-correlation-${editor.id}")
                    .contentType("application/json")
                    .content(objectMapper.writeValueAsString(LoginRequest(editor.login, PASSWORD))),
            ).andExpect(status().isOk)
        mockMvc
            .perform(
                get("/api/admin/audit")
                    .header("Authorization", authorization(admin))
                    .param("search", "audit-correlation-${editor.id}"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].userId").value(editor.id.toString()))
        mockMvc
            .perform(get("/api/admin/audit").header("Authorization", authorization(editor)))
            .andExpect(status().isForbidden)
    }
}
