package me.ultard.vacatime.filter

import io.jsonwebtoken.JwtException
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import me.ultard.vacatime.repository.UserRepository
import me.ultard.vacatime.security.JwtService
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtFilter(
    private val jwtService: JwtService,
    private val userRepository: UserRepository,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val authorization = request.getHeader("Authorization")
        if (authorization?.startsWith("Bearer ") == true) {
            try {
                val userId = jwtService.subject(authorization.substring(7))
                val user = userRepository.findById(userId).orElse(null)
                if (user?.active == true) {
                    val authorities = user.roles.map { SimpleGrantedAuthority("ROLE_${it.name}") }
                    SecurityContextHolder.getContext().authentication =
                        UsernamePasswordAuthenticationToken(user, null, authorities)
                }
            } catch (_: JwtException) {
                SecurityContextHolder.clearContext()
            } catch (_: IllegalArgumentException) {
                SecurityContextHolder.clearContext()
            }
        }
        filterChain.doFilter(request, response)
    }
}
