package me.ultard.vacatime.service

import me.ultard.vacatime.domain.Department
import me.ultard.vacatime.domain.Shift
import me.ultard.vacatime.domain.ShiftPlan
import me.ultard.vacatime.domain.Vacation
import me.ultard.vacatime.domain.VacationStatus
import me.ultard.vacatime.dto.AvailabilityDto
import me.ultard.vacatime.dto.DepartmentAvailabilityDto
import me.ultard.vacatime.dto.ShiftAvailabilityDto
import me.ultard.vacatime.dto.ShiftDayAvailabilityDto
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.error.ValidationException
import me.ultard.vacatime.repository.DepartmentRepository
import me.ultard.vacatime.repository.ShiftPlanRepository
import me.ultard.vacatime.repository.ShiftRepository
import me.ultard.vacatime.repository.VacationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
@Transactional(readOnly = true)
class AvailabilityService(
    private val departmentRepository: DepartmentRepository,
    private val shiftRepository: ShiftRepository,
    private val shiftPlanRepository: ShiftPlanRepository,
    private val vacationRepository: VacationRepository,
) {
    fun forecast(
        from: LocalDate,
        to: LocalDate,
        departmentId: UUID?,
    ): AvailabilityDto {
        validateRange(from, to)
        if (departmentId != null &&
            departmentRepository.findByIdAndActiveTrue(departmentId) == null
        ) {
            throw NotFoundException("Department not found")
        }

        val shifts =
            shiftRepository
                .findActiveForAvailability()
                .filter { departmentId == null || it.department?.id == departmentId }
        val plans = shiftPlanRepository.findAvailabilityPlans(from, to, departmentId)
        val plansByKey = plans.associateBy { requireNotNull(it.shift).id to it.workDate }
        val employeeIds =
            plans
                .flatMap {
                    it.assignments.mapNotNull { assignment ->
                        assignment.employee?.id
                    }
                }.toSet()
        val vacations =
            if (employeeIds.isEmpty()) {
                emptyList()
            } else {
                vacationRepository.findAvailabilityVacations(
                    employeeIds,
                    setOf(VacationStatus.APPROVED, VacationStatus.PENDING),
                    from,
                    to,
                )
            }
        val vacationsByEmployee = vacations.groupBy { it.employee!!.id }
        val dates = generateSequence(from) { it.plusDays(1) }.takeWhile { !it.isAfter(to) }.toList()

        val result =
            shifts
                .groupBy { requireNotNull(it.department) }
                .map { (department, departmentShifts) ->
                    department.toAvailabilityDto(
                        departmentShifts,
                        dates,
                        plansByKey,
                        vacationsByEmployee,
                    )
                }
        return AvailabilityDto(from, to, result)
    }

    private fun validateRange(
        from: LocalDate,
        to: LocalDate,
    ) {
        val today = LocalDate.now()
        if (from.isAfter(to) || from.isBefore(today) || ChronoUnit.DAYS.between(from, to) > 365) {
            throw ValidationException(
                "Availability range must be within today and the following 365 days",
            )
        }
    }
}

private fun Department.toAvailabilityDto(
    shifts: List<Shift>,
    dates: List<LocalDate>,
    plansByKey: Map<Pair<UUID, LocalDate>, ShiftPlan>,
    vacationsByEmployee: Map<UUID, List<Vacation>>,
) = DepartmentAvailabilityDto(
    id = id,
    name = name,
    shifts =
        shifts.map { shift ->
            val shiftId = shift.id
            ShiftAvailabilityDto(
                id = shiftId,
                name = shift.name,
                days =
                    dates.map { date ->
                        val plan = plansByKey[shiftId to date]
                        if (plan == null) {
                            ShiftDayAvailabilityDto(
                                date,
                                false,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                            )
                        } else {
                            val employees =
                                plan.assignments
                                    .mapNotNull { it.employee?.id }
                                    .toSet()
                            val approvedEmployees =
                                employees.filterTo(mutableSetOf()) { employeeId ->
                                    vacationsByEmployee[employeeId].orEmpty().any {
                                        it.status == VacationStatus.APPROVED &&
                                            it.startDate <= date &&
                                            it.endDate >= date
                                    }
                                }
                            val pendingEmployees =
                                employees.filterTo(mutableSetOf()) { employeeId ->
                                    employeeId !in approvedEmployees &&
                                        vacationsByEmployee[employeeId].orEmpty().any {
                                            it.status == VacationStatus.PENDING &&
                                                it.startDate <= date &&
                                                it.endDate >= date
                                        }
                                }
                            val approved = approvedEmployees.size
                            val pending = pendingEmployees.size
                            val scheduled = employees.size
                            val availableAfterApproved = scheduled - approved
                            val forecastAvailable = availableAfterApproved - pending
                            ShiftDayAvailabilityDto(
                                date = date,
                                planned = true,
                                minimumStaff = plan.minimumStaff,
                                scheduledStaff = scheduled,
                                approvedAbsent = approved,
                                pendingAbsent = pending,
                                availableAfterApproved = availableAfterApproved,
                                forecastAvailable = forecastAvailable,
                                confirmedShortage = availableAfterApproved < plan.minimumStaff,
                                forecastShortage = forecastAvailable < plan.minimumStaff,
                            )
                        }
                    },
            )
        },
)
