package me.ultard.vacatime.filter

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.MDC
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.UUID

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class CorrelationFilter : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val correlationId =
            request.getHeader("X-Correlation-ID")?.takeIf {
                it.matches(Regex("[a-zA-Z0-9._-]{1,100}"))
            } ?: UUID.randomUUID().toString()

        request.setAttribute("correlationId", correlationId)
        response.setHeader("X-Correlation-ID", correlationId)
        MDC.put("correlationId", correlationId)
        try {
            filterChain.doFilter(request, response)
        } finally {
            MDC.remove("correlationId")
        }
    }
}
