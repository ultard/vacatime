package me.ultard.vacatime.security

import io.jsonwebtoken.JwtException
import me.ultard.vacatime.domain.User
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class JwtServiceTest {
    private val jwtService =
        JwtService("test-secret-test-secret-test-secret-test-secret-123456", 15)

    @Test
    fun `valid signed token resolves its user`() {
        val user = User()
        assertEquals(user.id, jwtService.subject(jwtService.create(user)))
    }

    @Test
    fun `token signed with another key is rejected`() {
        val otherIssuer =
            JwtService("other-secret-other-secret-other-secret-other-secret-123456", 15)
        val token = otherIssuer.create(User())
        assertThrows(JwtException::class.java) { jwtService.subject(token) }
    }
}
