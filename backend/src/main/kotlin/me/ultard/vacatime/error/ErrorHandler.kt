package me.ultard.vacatime.error

import jakarta.persistence.OptimisticLockException
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.orm.ObjectOptimisticLockingFailureException
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException

@RestControllerAdvice
class ErrorHandler {
    private val logger = LoggerFactory.getLogger(ErrorHandler::class.java)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun validation(
        exception: MethodArgumentNotValidException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> {
        val fieldErrors =
            exception.bindingResult.fieldErrors.associate {
                it.field to (it.defaultMessage ?: "Invalid value")
            }
        return error(400, "VALIDATION_ERROR", "Request validation failed", request, fieldErrors)
    }

    @ExceptionHandler(
        ValidationException::class,
        IllegalArgumentException::class,
        ConstraintViolationException::class,
        HttpMessageNotReadableException::class,
        MissingServletRequestParameterException::class,
        MethodArgumentTypeMismatchException::class,
    )
    fun invalidRequest(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> =
        error(400, "VALIDATION_ERROR", "Invalid request parameters or body", request)

    @ExceptionHandler(NotFoundException::class)
    fun notFound(
        exception: NotFoundException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> =
        error(404, "NOT_FOUND", exception.message ?: "Resource not found", request)

    @ExceptionHandler(ConflictException::class)
    fun conflict(
        exception: ConflictException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> =
        error(409, "CONFLICT", exception.message ?: "Business conflict", request)

    @ExceptionHandler(
        ObjectOptimisticLockingFailureException::class,
        OptimisticLockException::class,
    )
    fun staleVersion(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> =
        error(409, "VERSION_CONFLICT", "Vacation version is stale", request)

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun integrityViolation(
        exception: DataIntegrityViolationException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> = error(409, "CONFLICT", "Database constraint conflict", request)

    @ExceptionHandler(UnauthorizedException::class)
    fun unauthorized(
        exception: UnauthorizedException,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> =
        error(401, "UNAUTHORIZED", exception.message ?: "Authentication failed", request)

    @ExceptionHandler(ForbiddenOperationException::class, AccessDeniedException::class)
    fun forbidden(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> = error(403, "FORBIDDEN", "Access is denied", request)

    @ExceptionHandler(Exception::class)
    fun unexpectedError(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ApiError> {
        logger.error("Unhandled request error", exception)
        return error(500, "INTERNAL_ERROR", "Unexpected server error", request)
    }

    private fun error(
        status: Int,
        error: String,
        message: String,
        request: HttpServletRequest,
        fieldErrors: Map<String, String> = emptyMap(),
    ): ResponseEntity<ApiError> =
        ResponseEntity
            .status(status)
            .body(
                ApiError(
                    status = status,
                    error = error,
                    message = message,
                    path = request.requestURI,
                    correlationId = request.getAttribute("correlationId") as? String,
                    fieldErrors = fieldErrors,
                ),
            )
}
