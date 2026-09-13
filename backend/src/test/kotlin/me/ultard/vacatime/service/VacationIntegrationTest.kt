package me.ultard.vacatime.service

import me.ultard.vacatime.domain.Role
import me.ultard.vacatime.domain.VacationStatus
import me.ultard.vacatime.dto.VacationDto
import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate

class VacationIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `CRUD updates version and soft delete can be restored`() {
        val editor = createUser()
        val request = vacationRequest(editor)
        val created = createVacation(editor, request)
        assertEquals(7, created.daysCount)
        val updated =
            response<VacationDto>(
                mockMvc
                    .perform(
                        put("/api/vacations/${created.id}")
                            .header("Authorization", authorization(editor))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                objectMapper.writeValueAsString(
                                    request.copy(title = "Updated", version = created.version),
                                ),
                            ),
                    ).andExpect(status().isOk),
            )
        assertTrue(requireNotNull(updated.version) > requireNotNull(created.version))
        mockMvc
            .perform(
                delete("/api/vacations/${created.id}")
                    .header("Authorization", authorization(editor)),
            ).andExpect(status().isOk)
        mockMvc
            .perform(
                get("/api/vacations/${created.id}").header("Authorization", authorization(editor)),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.archived").value(true))
        postJson("/api/vacations/${created.id}/restore", emptyMap<String, String>(), editor)
            .andExpect(status().isOk)
        mockMvc
            .perform(
                get("/api/vacations/${created.id}").header("Authorization", authorization(editor)),
            ).andExpect(jsonPath("$.archived").value(false))
    }

    @Test
    fun `stale version returns conflict and preserves the stored vacation`() {
        val editor = createUser()
        val request = vacationRequest(editor)
        val created = createVacation(editor, request)
        mockMvc
            .perform(
                put("/api/vacations/${created.id}")
                    .header("Authorization", authorization(editor))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            request.copy(title = "Should not save", version = 99),
                        ),
                    ),
            ).andExpect(status().isConflict)
        assertEquals(request.title, vacationRepository.findById(created.id).orElseThrow().title)
    }

    @Test
    fun `reversed dates and overlapping vacations are rejected`() {
        val editor = createUser()
        val request = vacationRequest(editor)
        postJson("/api/vacations", request.copy(endDate = request.startDate.minusDays(1)), editor)
            .andExpect(status().isConflict)
        createVacation(editor, request)
        postJson("/api/vacations", request.copy(startDate = request.endDate), editor)
            .andExpect(status().isConflict)
        postJson("/api/vacations", request.copy(status = VacationStatus.CANCELLED), editor)
            .andExpect(status().isOk)
    }

    @Test
    fun `rejected vacation cannot be approved`() {
        val editor = createUser()
        val request = vacationRequest(editor).copy(status = VacationStatus.REJECTED)
        val vacation = createVacation(editor, request)
        mockMvc
            .perform(
                put("/api/vacations/${vacation.id}")
                    .header("Authorization", authorization(editor))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            request.copy(
                                status = VacationStatus.APPROVED,
                                version = vacation.version,
                            ),
                        ),
                    ),
            ).andExpect(status().isConflict)
    }

    @Test
    fun `server calculates priority and applies all filters`() {
        val editor = createUser()
        val request =
            vacationRequest(editor)
                .copy(title = "Unique filtered vacation", urgent = true, tags = setOf("filter-tag"))
        createVacation(editor, request)
        createVacation(editor, vacationRequest(editor, LocalDate.of(2030, 8, 1)))
        mockMvc
            .perform(
                get("/api/vacations")
                    .header("Authorization", authorization(editor))
                    .param("search", "filtered")
                    .param("employeeId", editor.id.toString())
                    .param("vacationTypeId", ANNUAL_TYPE_ID.toString())
                    .param("urgent", "true")
                    .param("priority", "HIGH")
                    .param("tag", "filter-tag")
                    .param("archived", "false")
                    .param("status", "DRAFT")
                    .param("startDateFrom", "2030-06-01")
                    .param("startDateTo", "2030-06-30")
                    .param("daysCount", "6")
                    .param("daysCountOperator", "GT")
                    .param("sort", "startDate")
                    .param("direction", "ASC")
                    .param("size", "1000"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.size").value(100))
            .andExpect(jsonPath("$.content[0].priority").value("HIGH"))
    }

    @Test
    fun `viewer cannot mutate and permanent deletion requires admin`() {
        val viewer = createUser(Role.VIEWER)
        val editor = createUser()
        val admin = createUser(Role.ADMIN)
        postJson("/api/vacations", vacationRequest(viewer), viewer).andExpect(status().isForbidden)
        val vacation = createVacation(editor)
        mockMvc
            .perform(
                delete("/api/vacations/${vacation.id}/permanent")
                    .header("Authorization", authorization(editor)),
            ).andExpect(status().isForbidden)
        mockMvc
            .perform(
                delete("/api/vacations/${vacation.id}/permanent")
                    .header("Authorization", authorization(admin)),
            ).andExpect(status().isOk)
        mockMvc
            .perform(
                get("/api/vacations/${vacation.id}").header("Authorization", authorization(admin)),
            ).andExpect(status().isNotFound)
    }
}
