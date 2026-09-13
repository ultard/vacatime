package me.ultard.vacatime.config

import me.ultard.vacatime.domain.User
import me.ultard.vacatime.filter.JwtFilter
import me.ultard.vacatime.security.ApiSecurityErrorHandler
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authorization.AuthorizationDecision
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig(
    private val jwtFilter: JwtFilter,
    private val securityErrorHandler: ApiSecurityErrorHandler,
) {
    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun jwtFilterRegistration(): FilterRegistrationBean<JwtFilter> =
        FilterRegistrationBean(jwtFilter).apply { isEnabled = false }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain =
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling {
                it.authenticationEntryPoint(securityErrorHandler)
                it.accessDeniedHandler(securityErrorHandler)
            }.authorizeHttpRequests {
                it
                    .requestMatchers(
                        "/api/auth/login",
                        "/api/auth/refresh",
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                    ).permitAll()
                it
                    .requestMatchers(
                        "/api/auth/me",
                        "/api/auth/change-password",
                        "/api/auth/logout",
                    ).authenticated()
                it.anyRequest().access { authentication, _ ->
                    val user = authentication.get().principal as? User
                    AuthorizationDecision(user?.active == true && !user.mustChangePassword)
                }
            }.addFilterBefore(
                jwtFilter,
                UsernamePasswordAuthenticationFilter::class.java,
            ).build()
}
