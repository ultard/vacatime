package me.ultard.vacatime.controller

import io.swagger.v3.oas.annotations.security.SecurityRequirement
import me.ultard.vacatime.dto.AnalyticsDto
import me.ultard.vacatime.service.AnalyticsService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/analytics")
@SecurityRequirement(name = "bearerAuth")
class AnalyticsController(
    private val analyticsService: AnalyticsService,
) {
    @GetMapping("/summary")
    fun summary(): AnalyticsDto = analyticsService.summary()
}
