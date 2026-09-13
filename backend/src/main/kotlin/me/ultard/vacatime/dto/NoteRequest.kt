package me.ultard.vacatime.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class NoteRequest(
    @field:NotBlank
    @field:Size(max = 4000)
    val text: String,
    val pinned: Boolean = false,
)
