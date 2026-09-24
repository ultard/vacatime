package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import me.ultard.vacatime.dto.AnalyticsDto
import me.ultard.vacatime.dto.AvailabilityDto
import me.ultard.vacatime.service.AnalyticsService
import me.ultard.vacatime.service.AvailabilityService
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/api/analytics")
@SecurityRequirement(name = "bearerAuth")
class AnalyticsController(
    private val analyticsService: AnalyticsService,
    private val availabilityService: AvailabilityService,
) {
    @GetMapping("/summary")
    fun summary(): AnalyticsDto = analyticsService.summary()

    @GetMapping("/availability")
    fun availability(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) from: LocalDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) to: LocalDate,
        @RequestParam(required = false) departmentId: UUID?,
    ): AvailabilityDto = availabilityService.forecast(from, to, departmentId)
}
