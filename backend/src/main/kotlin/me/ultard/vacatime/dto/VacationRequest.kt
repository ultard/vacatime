package me.ultard.vacatime.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import me.ultard.vacatime.domain.VacationStatus
import java.time.LocalDate
import java.util.UUID

data class VacationRequest(
    @field:NotNull
    val employeeId: UUID,
    @field:NotNull
    val vacationTypeId: UUID,
    @field:NotBlank
    @field:Size(max = 255)
    val title: String,
    @field:Size(max = 4000)
    val description: String? = null,
    @field:NotNull
    val startDate: LocalDate,
    @field:NotNull
    val endDate: LocalDate,
    val urgent: Boolean = false,
    @field:Size(max = 20)
    val tags: Set<String> = emptySet(),
    val status: VacationStatus = VacationStatus.DRAFT,
    val version: Long? = null,
)
