package me.ultard.vacatime.mapper

import me.ultard.vacatime.domain.VacationNote
import me.ultard.vacatime.dto.NoteDto

fun VacationNote.toDto() = NoteDto(id, author!!.toDto(), text, pinned, createdAt)
