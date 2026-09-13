package me.ultard.vacatime.service

import me.ultard.vacatime.domain.VacationNote
import me.ultard.vacatime.dto.NoteDto
import me.ultard.vacatime.dto.NoteRequest
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.mapper.toDto
import me.ultard.vacatime.repository.UserRepository
import me.ultard.vacatime.repository.VacationNoteRepository
import me.ultard.vacatime.repository.VacationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
@Transactional(readOnly = true)
class VacationNoteService(
    private val vacationNoteRepository: VacationNoteRepository,
    private val vacationRepository: VacationRepository,
    private val userRepository: UserRepository,
    private val auditService: AuditService,
) {
    fun list(vacationId: UUID): List<NoteDto> {
        requireVacation(vacationId)
        return vacationNoteRepository
            .findAllByVacationIdOrderByPinnedDescCreatedAtDesc(vacationId)
            .map { it.toDto() }
    }

    @Transactional
    fun create(
        vacationId: UUID,
        authorId: UUID,
        request: NoteRequest,
    ): NoteDto {
        val vacation =
            vacationRepository.findById(vacationId).orElseThrow {
                NotFoundException("Vacation not found")
            }
        val author =
            userRepository.findById(authorId).orElseThrow { NotFoundException("Author not found") }
        val note =
            VacationNote(
                vacation = vacation,
                author = author,
                text = request.text,
                pinned = request.pinned,
            )
        vacationNoteRepository.save(note)
        auditService.log("CREATE", "VACATION_NOTE", note.id)
        return note.toDto()
    }

    @Transactional
    fun update(
        vacationId: UUID,
        noteId: UUID,
        request: NoteRequest,
    ): NoteDto {
        val note = findNote(vacationId, noteId)
        note.text = request.text
        note.pinned = request.pinned
        note.updatedAt = Instant.now()
        auditService.log("UPDATE", "VACATION_NOTE", noteId)
        return note.toDto()
    }

    @Transactional
    fun delete(
        vacationId: UUID,
        noteId: UUID,
    ) {
        vacationNoteRepository.delete(findNote(vacationId, noteId))
        auditService.log("DELETE", "VACATION_NOTE", noteId)
    }

    private fun findNote(
        vacationId: UUID,
        noteId: UUID,
    ): VacationNote {
        val note =
            vacationNoteRepository.findById(noteId).orElseThrow {
                NotFoundException("Note not found")
            }
        if (note.vacation?.id != vacationId) {
            throw NotFoundException("Note not found for this vacation")
        }
        return note
    }

    private fun requireVacation(vacationId: UUID) {
        if (!vacationRepository.existsById(vacationId)) {
            throw NotFoundException("Vacation not found")
        }
    }
}
