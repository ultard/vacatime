package me.ultard.vacatime.domain

enum class VacationStatus {
    DRAFT,
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED,
    ;

    companion object {
        val ACTIVE_STATUSES = setOf(DRAFT, PENDING, APPROVED)
    }
}
