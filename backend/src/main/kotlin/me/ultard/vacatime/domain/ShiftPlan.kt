package me.ultard.vacatime.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(
    name = "shift_plans",
    uniqueConstraints = [UniqueConstraint(columnNames = ["shift_id", "work_date"])],
)
class ShiftPlan(
    @Id
    var id: UUID = UUID.randomUUID(),
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    var shift: Shift? = null,
    @Column(name = "work_date", nullable = false)
    var workDate: LocalDate = LocalDate.now(),
    @Column(name = "minimum_staff", nullable = false)
    var minimumStaff: Int = 0,
    @OneToMany(mappedBy = "plan", fetch = FetchType.LAZY)
    var assignments: MutableList<ShiftPlanAssignment> = mutableListOf(),
)
