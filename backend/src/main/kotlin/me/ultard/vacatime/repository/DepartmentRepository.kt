package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.Department
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface DepartmentRepository : JpaRepository<Department, UUID> {
    fun findAllByActiveTrueOrderByName(): List<Department>

    fun findByIdAndActiveTrue(id: UUID): Department?
}
