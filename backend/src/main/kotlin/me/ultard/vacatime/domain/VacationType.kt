package me.ultard.vacatime.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "vacation_types")
class VacationType(
    @Id
    var id: UUID = UUID.randomUUID(),
    @Column(unique = true, nullable = false)
    var code: String = "",
    @Column(unique = true, nullable = false)
    var name: String = "",
    var description: String? = null,
    var active: Boolean = true,
)
