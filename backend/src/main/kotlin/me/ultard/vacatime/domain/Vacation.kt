package me.ultard.vacatime.domain

import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "vacations")
class Vacation(
    @Id
    var id: UUID = UUID.randomUUID(),
    @Column(name = "vacation_number", unique = true, nullable = false)
    var vacationNumber: String = "",
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    var employee: User? = null,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vacation_type_id", nullable = false)
    var vacationType: VacationType? = null,
    @Column(nullable = false)
    var title: String = "",
    var description: String? = null,
    @Column(name = "start_date")
    var startDate: LocalDate = LocalDate.now(),
    @Column(name = "end_date")
    var endDate: LocalDate = LocalDate.now(),
    @Column(name = "days_count")
    var daysCount: Int = 1,
    @Enumerated(EnumType.STRING)
    var status: VacationStatus = VacationStatus.DRAFT,
    var urgent: Boolean = false,
    @ElementCollection
    @CollectionTable(name = "vacation_tags", joinColumns = [JoinColumn(name = "vacation_id")])
    @Column(name = "tag")
    var tags: MutableSet<String> = mutableSetOf(),
    @Enumerated(EnumType.STRING)
    var priority: VacationPriority = VacationPriority.NORMAL,
    @Column(name = "created_at")
    var createdAt: Instant = Instant.now(),
    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now(),
    @Version
    var version: Long? = null,
    var archived: Boolean = false,
)
