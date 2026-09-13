package me.ultard.vacatime.dto

import jakarta.validation.constraints.NotEmpty
import me.ultard.vacatime.domain.VacationStatus
import java.util.UUID

data class BulkRequest(
    @field:NotEmpty
    val ids: Set<UUID>,
    val operation: BulkOperation,
    val status: VacationStatus? = null,
    val tag: String? = null,
)
