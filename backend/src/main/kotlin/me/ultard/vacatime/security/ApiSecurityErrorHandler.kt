package me.ultard.vacatime.security

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import me.ultard.vacatime.error.ApiError
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper

@Component
class ApiSecurityErrorHandler(
    private val objectMapper: ObjectMapper,
) : AuthenticationEntryPoint,
    AccessDeniedHandler {
    override fun commence(
        request: HttpServletRequest,
        response: HttpServletResponse,
        exception: AuthenticationException,
    ) {
        writeError(request, response, 401, "UNAUTHORIZED", "Authentication is required")
    }

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        exception: AccessDeniedException,
    ) {
        writeError(request, response, 403, "FORBIDDEN", "Access is denied")
    }

    private fun writeError(
        request: HttpServletRequest,
        response: HttpServletResponse,
        status: Int,
        error: String,
        message: String,
    ) {
        response.status = status
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = "UTF-8"
        response.writer.write(
            objectMapper.writeValueAsString(
                ApiError(
                    status = status,
                    error = error,
                    message = message,
                    path = request.requestURI,
                    correlationId = request.getAttribute("correlationId") as? String,
                ),
            ),
        )
    }
}
