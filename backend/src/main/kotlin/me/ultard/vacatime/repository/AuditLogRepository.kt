package me.ultard.vacatime.repository

import me.ultard.vacatime.domain.AuditLog
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface AuditLogRepository :
    JpaRepository<AuditLog, UUID>,
    JpaSpecificationExecutor<AuditLog>
