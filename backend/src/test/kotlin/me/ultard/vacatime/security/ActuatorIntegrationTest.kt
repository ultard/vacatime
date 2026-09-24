package me.ultard.vacatime.security

import me.ultard.vacatime.domain.Role
import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class ActuatorIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `health is public and metrics are admin-only`() {
        mockMvc
            .perform(get("/actuator/health"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("UP"))

        mockMvc
            .perform(get("/actuator/metrics"))
            .andExpect(status().isUnauthorized)

        val viewer = createUser(Role.VIEWER)
        mockMvc
            .perform(get("/actuator/metrics").header("Authorization", authorization(viewer)))
            .andExpect(status().isForbidden)

        val admin = createUser(Role.ADMIN)
        mockMvc
            .perform(get("/actuator/metrics").header("Authorization", authorization(admin)))
            .andExpect(status().isOk)
    }
}
