package me.ultard.vacatime.service

import me.ultard.vacatime.dto.ImportApplyResult
import me.ultard.vacatime.dto.ImportMode
import me.ultard.vacatime.dto.ImportPreviewResult
import me.ultard.vacatime.dto.ImportRequest
import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class VacationCsvIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `filtered CSV roundtrip preserves quoted fields and preview does not persist`() {
        val editor = createUser()
        val title = "Vacation, with \"quotes\" and\nnewline"
        val vacation = createVacation(editor, vacationRequest(editor).copy(title = title))
        val csv =
            mockMvc
                .perform(
                    get("/api/vacations/export")
                        .header("Authorization", authorization(editor))
                        .param("employeeId", editor.id.toString()),
                ).andExpect(status().isOk)
                .andReturn()
                .response
                .contentAsString
        val countBeforePreview = vacationRepository.count()
        val request = ImportRequest(csv, ImportMode.UPSERT_BY_VACATION_NUMBER)
        val preview =
            response<ImportPreviewResult>(
                postJson("/api/vacations/import/preview", request, editor).andExpect(status().isOk),
            )
        assertEquals(1, preview.validRows.size)
        assertEquals(0, preview.invalidRows.size)
        assertEquals(
            title,
            preview.validRows
                .single()
                .request
                ?.title,
        )
        assertEquals(countBeforePreview, vacationRepository.count())
        val applied =
            response<ImportApplyResult>(
                postJson("/api/vacations/import/apply", request, editor).andExpect(status().isOk),
            )
        assertEquals(listOf(vacation.id), applied.successfulIds)
        assertEquals(0, applied.errors.size)
        val stalePreview =
            response<ImportPreviewResult>(
                postJson("/api/vacations/import/preview", request, editor).andExpect(status().isOk),
            )
        assertEquals(1, stalePreview.invalidRows.size)
    }

    @Test
    fun `create-only preview reports existing vacation numbers`() {
        val editor = createUser()
        createVacation(editor)
        val csv =
            mockMvc
                .perform(
                    get("/api/vacations/export")
                        .header("Authorization", authorization(editor))
                        .param("employeeId", editor.id.toString()),
                ).andReturn()
                .response
                .contentAsString
        val preview =
            response<ImportPreviewResult>(
                postJson("/api/vacations/import/preview", ImportRequest(csv), editor)
                    .andExpect(status().isOk),
            )
        assertEquals(0, preview.validRows.size)
        assertEquals(1, preview.invalidRows.size)
    }
}
