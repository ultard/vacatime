package me.ultard.vacatime.controller

import jakarta.validation.Valid
import me.ultard.vacatime.dto.ImportApplyResult
import me.ultard.vacatime.dto.ImportPreviewResult
import me.ultard.vacatime.dto.ImportRequest
import me.ultard.vacatime.dto.VacationFilter
import me.ultard.vacatime.service.VacationCsvService
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/vacations")
class VacationCsvController(
    private val vacationCsvService: VacationCsvService,
) {
    @GetMapping("/export")
    fun export(
        @ModelAttribute filter: VacationFilter,
    ): ResponseEntity<String> =
        ResponseEntity
            .ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=vacations.csv")
            .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
            .body(vacationCsvService.export(filter))

    @PostMapping("/import/preview")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun preview(
        @Valid @RequestBody request: ImportRequest,
    ): ImportPreviewResult = vacationCsvService.preview(request)

    @PostMapping("/import/apply")
    @PreAuthorize("hasAnyRole('EDITOR', 'ADMIN')")
    fun apply(
        @Valid @RequestBody request: ImportRequest,
    ): ImportApplyResult = vacationCsvService.apply(request)
}
