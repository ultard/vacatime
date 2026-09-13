package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.VacationNote
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface VacationNoteRepository : JpaRepository<VacationNote, UUID> {
    fun findAllByVacationIdOrderByPinnedDescCreatedAtDesc(vacationId: UUID): List<VacationNote>
}
