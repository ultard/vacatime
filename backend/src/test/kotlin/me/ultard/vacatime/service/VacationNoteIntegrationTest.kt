package me.ultard.vacatime.service

import me.ultard.vacatime.dto.NoteDto
import me.ultard.vacatime.dto.NoteRequest
import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate

class VacationNoteIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `a note cannot be edited through another vacation URL`() {
        val editor = createUser()
        val firstVacation = createVacation(editor)
        val secondVacation =
            createVacation(editor, vacationRequest(editor, LocalDate.of(2030, 9, 1)))
        val note =
            response<NoteDto>(
                postJson(
                    "/api/vacations/${firstVacation.id}/notes",
                    NoteRequest("Original"),
                    editor,
                ).andExpect(status().isOk),
            )
        mockMvc
            .perform(
                put("/api/vacations/${secondVacation.id}/notes/${note.id}")
                    .header("Authorization", authorization(editor))
                    .contentType("application/json")
                    .content(objectMapper.writeValueAsString(NoteRequest("Wrong vacation"))),
            ).andExpect(status().isNotFound)
    }
}
