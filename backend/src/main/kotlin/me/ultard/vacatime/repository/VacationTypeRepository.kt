package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.VacationType
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface VacationTypeRepository : JpaRepository<VacationType, UUID> {
    fun findByCode(code: String): VacationType?
}
