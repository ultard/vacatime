package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import me.ultard.vacatime.domain.User
import me.ultard.vacatime.dto.NoteDto
import me.ultard.vacatime.dto.NoteRequest
import me.ultard.vacatime.service.VacationNoteService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/vacations/{id}/notes")
@SecurityRequirement(name = "bearerAuth")
class VacationNoteController(
    private val vacationNoteService: VacationNoteService,
) {
    @GetMapping
    fun list(
        @PathVariable id: UUID,
    ): List<NoteDto> = vacationNoteService.list(id)

    @PostMapping
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun create(
        @PathVariable id: UUID,
        @AuthenticationPrincipal user: User,
        @Valid @RequestBody request: NoteRequest,
    ): NoteDto = vacationNoteService.create(id, user.id, request)

    @PutMapping("/{noteId}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun update(
        @PathVariable id: UUID,
        @PathVariable noteId: UUID,
        @Valid @RequestBody request: NoteRequest,
    ): NoteDto = vacationNoteService.update(id, noteId, request)

    @DeleteMapping("/{noteId}")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun delete(
        @PathVariable id: UUID,
        @PathVariable noteId: UUID,
    ) = vacationNoteService.delete(id, noteId)
}
