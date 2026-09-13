package me.ultard.vacatime.service

import me.ultard.vacatime.dto.BulkRequest
import me.ultard.vacatime.dto.BulkResult
import me.ultard.vacatime.error.ConflictException
import me.ultard.vacatime.error.NotFoundException
import me.ultard.vacatime.error.ValidationException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.orm.ObjectOptimisticLockingFailureException
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class VacationBulkService(
    private val vacationService: VacationService,
) {
    fun apply(request: BulkRequest): BulkResult {
        if (request.ids.size > 500) {
            throw ValidationException("At most 500 vacations can be processed at once")
        }
        val successfulIds = mutableListOf<UUID>()
        val errors = mutableMapOf<UUID, String>()

        for (id in request.ids) {
            try {
                vacationService.applyBulkOperation(id, request)
                successfulIds += id
            } catch (exception: NotFoundException) {
                errors[id] = exception.message ?: "Vacation not found"
            } catch (exception: ConflictException) {
                errors[id] = exception.message ?: "Business conflict"
            } catch (exception: ValidationException) {
                errors[id] = exception.message ?: "Invalid operation"
            } catch (exception: ObjectOptimisticLockingFailureException) {
                errors[id] = "Vacation version is stale"
            } catch (exception: DataIntegrityViolationException) {
                errors[id] = "Database constraint conflict"
            }
        }

        return BulkResult(successfulIds, errors)
    }
}
