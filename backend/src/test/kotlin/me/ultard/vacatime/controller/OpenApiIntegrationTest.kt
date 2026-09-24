package me.ultard.vacatime.controller

import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class OpenApiIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `openapi exposes core routes and bearer authentication`() {
        mockMvc
            .perform(get("/v3/api-docs"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.info.title").value("Vacation Management API"))
            .andExpect(jsonPath("$.paths['/api/auth/login'].post").exists())
            .andExpect(jsonPath("$.paths['/api/auth/login'].post.security").doesNotExist())
            .andExpect(jsonPath("$.paths['/api/auth/me'].get.security[0].bearerAuth").exists())
            .andExpect(jsonPath("$.paths['/api/vacations'].get").exists())
            .andExpect(jsonPath("$.paths['/api/vacations'].get.security[0].bearerAuth").exists())
            .andExpect(jsonPath("$.paths['/api/analytics/summary'].get").exists())
            .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
    }
}
