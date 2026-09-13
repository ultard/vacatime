package me.ultard.vacatime.security

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import me.ultard.vacatime.domain.User
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.Instant
import java.util.Date
import java.util.UUID

@Component
class JwtService(
    @Value("\${app.jwt.secret}") secret: String,
    @Value("\${app.jwt.access-minutes}") private val accessMinutes: Long,
) {
    private val signingKey = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))

    fun create(user: User): String =
        Jwts
            .builder()
            .subject(user.id.toString())
            .claim("roles", user.roles.map { it.name })
            .issuedAt(Date())
            .expiration(Date.from(Instant.now().plus(Duration.ofMinutes(accessMinutes))))
            .signWith(signingKey)
            .compact()

    fun subject(token: String): UUID =
        UUID.fromString(
            Jwts
                .parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .payload.subject,
        )
}
