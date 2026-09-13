package me.ultard.vacatime.support

import me.ultard.vacatime.domain.Role
import me.ultard.vacatime.domain.User
import me.ultard.vacatime.dto.LoginRequest
import me.ultard.vacatime.dto.TokenResponse
import me.ultard.vacatime.dto.VacationDto
import me.ultard.vacatime.dto.VacationRequest
import me.ultard.vacatime.repository.UserRepository
import me.ultard.vacatime.repository.VacationRepository
import me.ultard.vacatime.security.JwtService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper
import java.time.LocalDate
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
abstract class ApiIntegrationTest {
    @Autowired
    protected lateinit var mockMvc: MockMvc

    @Autowired
    protected lateinit var objectMapper: ObjectMapper

    @Autowired
    protected lateinit var userRepository: UserRepository

    @Autowired
    protected lateinit var vacationRepository: VacationRepository

    @Autowired
    protected lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    protected lateinit var jwtService: JwtService

    protected fun createUser(
        role: Role = Role.EDITOR,
        active: Boolean = true,
        mustChangePassword: Boolean = false,
    ): User =
        userRepository.saveAndFlush(
            User(
                login = "test-${UUID.randomUUID()}",
                fullName = "Test Employee",
                passwordHash = requireNotNull(passwordEncoder.encode(PASSWORD)),
                roles = mutableSetOf(role),
                active = active,
                mustChangePassword = mustChangePassword,
            ),
        )

    protected fun authorization(user: User): String = "Bearer ${jwtService.create(user)}"

    protected fun postJson(
        path: String,
        body: Any,
        user: User? = null,
    ): ResultActions {
        val request =
            post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
        if (user != null) {
            request.header("Authorization", authorization(user))
        }
        return mockMvc.perform(request)
    }

    protected final inline fun <reified T> response(result: ResultActions): T =
        objectMapper.readValue(result.andReturn().response.contentAsString, T::class.java)

    protected fun login(user: User): TokenResponse =
        response(
            postJson(
                "/api/auth/login",
                LoginRequest(user.login, PASSWORD),
            ).andExpect(status().isOk),
        )

    protected fun vacationRequest(
        employee: User,
        startDate: LocalDate = LocalDate.of(2030, 6, 1),
    ): VacationRequest =
        VacationRequest(
            employeeId = employee.id,
            vacationTypeId = ANNUAL_TYPE_ID,
            title = "Summer vacation",
            startDate = startDate,
            endDate = startDate.plusDays(6),
            tags = setOf("family"),
        )

    protected fun createVacation(
        editor: User,
        request: VacationRequest = vacationRequest(editor),
    ): VacationDto =
        response(
            postJson("/api/vacations", request, editor).andExpect(status().isOk),
        )

    companion object {
        const val PASSWORD = "TestPassword123!"
        val ANNUAL_TYPE_ID: UUID = UUID.fromString("00000000-0000-0000-0000-000000000001")
    }
}
