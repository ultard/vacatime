package me.ultard.vacatime.service

import me.ultard.vacatime.dto.BulkOperation
import me.ultard.vacatime.dto.BulkRequest
import me.ultard.vacatime.dto.BulkResult
import me.ultard.vacatime.support.ApiIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.UUID

class VacationBulkIntegrationTest : ApiIntegrationTest() {
    @Test
    fun `bulk reports failures separately without rolling back successful rows`() {
        val editor = createUser()
        val vacation = createVacation(editor)
        val missingId = UUID.randomUUID()
        val result =
            response<BulkResult>(
                postJson(
                    "/api/vacations/bulk",
                    BulkRequest(setOf(vacation.id, missingId), BulkOperation.ARCHIVE),
                    editor,
                ),
            )
        assertEquals(listOf(vacation.id), result.successfulIds)
        assertTrue(result.errors.containsKey(missingId))
        assertTrue(vacationRepository.findById(vacation.id).orElseThrow().archived)
    }
}
