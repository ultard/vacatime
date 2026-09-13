package me.ultard.vacatime.dto

data class AnalyticsDto(
    val totalCount: Long,
    val activeCount: Long,
    val archivedCount: Long,
    val urgentCount: Long,
    val averageDaysCount: Double,
    val byVacationType: Map<String, Long>,
    val byStatus: Map<String, Long>,
    val byPriority: Map<String, Long>,
)
