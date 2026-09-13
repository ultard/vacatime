package me.ultard.vacatime.repository

import jakarta.persistence.LockModeType
import me.ultard.vacatime.domain.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface UserRepository : JpaRepository<User, UUID> {
    fun findByLogin(login: String): User?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from User user where user.login = :login")
    fun findByLoginForUpdate(login: String): User?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from User user where user.id = :id")
    fun findByIdForUpdate(id: UUID): User?
}
