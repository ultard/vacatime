package me.ultard.vacatime.service

import me.ultard.vacatime.dto.ImportMode
import me.ultard.vacatime.dto.VacationDto
import me.ultard.vacatime.dto.VacationRequest
import me.ultard.vacatime.error.ConflictException
import me.ultard.vacatime.repository.VacationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class VacationImportRowService(
    private val vacationRepository: VacationRepository,
    private val vacationService: VacationService,
) {
    @Transactional
    fun apply(
        vacationNumber: String,
        request: VacationRequest,
        mode: ImportMode,
    ): VacationDto {
        val existingVacation = vacationRepository.findByVacationNumber(vacationNumber)
        if (existingVacation == null) {
            return vacationService.create(request, vacationNumber)
        }
        if (mode == ImportMode.CREATE_ONLY) {
            throw ConflictException("Vacation number already exists")
        }
        return vacationService.update(existingVacation.id, request)
    }
}
