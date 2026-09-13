package me.ultard.vacatime.service

import me.ultard.vacatime.dto.AnalyticsDto
import me.ultard.vacatime.repository.VacationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class AnalyticsService(
    private val vacationRepository: VacationRepository,
) {
    fun summary(): AnalyticsDto {
        val vacations = vacationRepository.findAll()
        return AnalyticsDto(
            totalCount = vacations.size.toLong(),
            activeCount = vacations.count { !it.archived }.toLong(),
            archivedCount = vacations.count { it.archived }.toLong(),
            urgentCount = vacations.count { it.urgent }.toLong(),
            averageDaysCount =
                if (vacations.isEmpty()) 0.0 else vacations.map { it.daysCount }.average(),
            byVacationType =
                vacations
                    .groupingBy { requireNotNull(it.vacationType).name }
                    .eachCount()
                    .mapValues { it.value.toLong() },
            byStatus =
                vacations.groupingBy { it.status.name }.eachCount().mapValues { it.value.toLong() },
            byPriority =
                vacations
                    .groupingBy { it.priority.name }
                    .eachCount()
                    .mapValues { it.value.toLong() },
        )
    }
}
