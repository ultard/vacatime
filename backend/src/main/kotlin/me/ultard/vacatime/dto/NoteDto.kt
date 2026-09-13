package me.ultard.vacatime.dto

import java.time.Instant
import java.util.UUID

data class NoteDto(
    val id: UUID,
    val author: UserDto,
    val text: String,
    val pinned: Boolean,
    val createdAt: Instant,
)
