package me.ultard.vacatime.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(
    name = "shift_plan_assignments",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["plan_id", "employee_id"]),
        UniqueConstraint(columnNames = ["work_date", "employee_id"]),
    ],
)
class ShiftPlanAssignment(
    @Id
    var id: UUID = UUID.randomUUID(),
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    var plan: ShiftPlan? = null,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    var employee: User? = null,
    @Column(name = "work_date", nullable = false)
    var workDate: LocalDate = LocalDate.now(),
)
