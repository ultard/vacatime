package me.ultard.vacatime.service

import me.ultard.vacatime.domain.Role
import me.ultard.vacatime.dto.AnalyticsDto
import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate

class AnalyticsIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `summary reflects created and archived vacations`() {
        val editor = createUser(Role.EDITOR)
        val before =
            response<AnalyticsDto>(
                mockMvc
                    .perform(
                        get("/api/analytics/summary").header(
                            "Authorization",
                            authorization(editor),
                        ),
                    ).andExpect(status().isOk),
            )

        val urgent = createVacation(editor, vacationRequest(editor).copy(urgent = true))
        val archived = createVacation(editor, vacationRequest(editor, LocalDate.of(2030, 6, 11)))
        mockMvc
            .perform(
                delete("/api/vacations/${archived.id}").header(
                    "Authorization",
                    authorization(editor),
                ),
            ).andExpect(status().isOk)

        val after =
            response<AnalyticsDto>(
                mockMvc
                    .perform(
                        get("/api/analytics/summary").header(
                            "Authorization",
                            authorization(editor),
                        ),
                    ).andExpect(status().isOk),
            )

        assertEquals(before.totalCount + 2, after.totalCount)
        assertEquals(before.activeCount + 1, after.activeCount)
        assertEquals(before.archivedCount + 1, after.archivedCount)
        assertEquals(before.urgentCount + 1, after.urgentCount)
        assertEquals(
            (before.byStatus[urgent.status.name] ?: 0L) + 2,
            after.byStatus[urgent.status.name],
        )
    }
}
