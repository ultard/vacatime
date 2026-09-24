package me.ultard.vacatime.service

import me.ultard.vacatime.domain.ShiftPlan
import me.ultard.vacatime.domain.ShiftPlanAssignment
import me.ultard.vacatime.dto.ShiftPlanRequest
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.error.ValidationException
import me.ultard.vacatime.repository.ShiftPlanRepository
import me.ultard.vacatime.repository.ShiftRepository
import me.ultard.vacatime.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class ShiftPlanService(
    private val shiftPlanRepository: ShiftPlanRepository,
    private val shiftRepository: ShiftRepository,
    private val userRepository: UserRepository,
    private val auditService: AuditService,
) {
    @Transactional
    fun replace(request: ShiftPlanRequest) {
        val days = request.days
        if (days.map { it.date }.toSet().size != days.size) {
            throw ValidationException("Each date can appear only once")
        }
        if (days.any { it.date.isBefore(LocalDate.now()) }) {
            throw ValidationException("Shift plans can only be set for today or a future date")
        }
        if (days.any { day ->
                day.shifts
                    .map { it.shiftId }
                    .toSet()
                    .size != day.shifts.size
            }
        ) {
            throw ValidationException("Each shift can appear only once per date")
        }

        val assignmentKeys =
            days.flatMap { day ->
                day.shifts.flatMap { shift ->
                    shift.employeeIds.map {
                        day.date to
                            it
                    }
                }
            }
        if (assignmentKeys.toSet().size != assignmentKeys.size) {
            throw ValidationException("An employee can be assigned to only one shift per date")
        }

        val shiftIds = days.flatMap { it.shifts }.map { it.shiftId }.toSet()
        val shifts = shiftRepository.findAllById(shiftIds).associateBy { it.id }
        val inactiveShift =
            shifts.values.firstOrNull { !it.active || it.department?.active != true }
        if (inactiveShift != null || shifts.size != shiftIds.size) {
            throw NotFoundException("An active shift was not found")
        }

        val employeeIds = assignmentKeys.map { it.second }.toSet()
        val employees = userRepository.findAllById(employeeIds).associateBy { it.id }
        if (employees.size != employeeIds.size) {
            throw NotFoundException("An employee was not found")
        }

        val plans =
            days.flatMap { day ->
                day.shifts.map { input ->
                    val plan =
                        ShiftPlan(
                            shift = shifts.getValue(input.shiftId),
                            workDate = day.date,
                            minimumStaff = input.minimumStaff,
                        )
                    plan.assignments =
                        input.employeeIds
                            .map { employeeId ->
                                ShiftPlanAssignment(
                                    plan = plan,
                                    employee = employees.getValue(employeeId),
                                    workDate = day.date,
                                )
                            }.toMutableList()
                    plan
                }
            }

        val dates = days.map { it.date }.toSet()
        shiftPlanRepository.deleteAllByWorkDateIn(dates)
        shiftPlanRepository.saveAll(plans)
        auditService.log(
            "REPLACE",
            "SHIFT_PLAN",
            null,
            "Replaced shift plans for ${dates.size} date(s)",
        )
    }
}
