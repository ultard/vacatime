package me.ultard.vacatime.repository

import jakarta.persistence.criteria.Predicate
import me.ultard.vacatime.domain.Vacation
import me.ultard.vacatime.dto.ComparisonOperator
import me.ultard.vacatime.dto.VacationFilter
import org.springframework.data.jpa.domain.Specification

object VacationSpecifications {
    fun matching(filter: VacationFilter): Specification<Vacation> =
        Specification { root, _, criteria ->
            val predicates = mutableListOf<Predicate>()

            filter.search
                ?.takeIf { it.isNotBlank() }
                ?.let { search ->
                    val escapedSearch =
                        search
                            .lowercase()
                            .replace("\\", "\\\\")
                            .replace("%", "\\%")
                            .replace("_", "\\_")
                    val pattern = "%$escapedSearch%"
                    predicates +=
                        criteria.or(
                            criteria.like(
                                criteria.lower(root.get("vacationNumber")),
                                pattern,
                                '\\',
                            ),
                            criteria.like(criteria.lower(root.get("title")), pattern, '\\'),
                            criteria.like(criteria.lower(root.get("description")), pattern, '\\'),
                            criteria.like(
                                criteria.lower(root.get<Any>("employee").get("fullName")),
                                pattern,
                                '\\',
                            ),
                            criteria.like(
                                criteria.lower(root.get<Any>("employee").get("login")),
                                pattern,
                                '\\',
                            ),
                        )
                }
            filter.employeeId?.let {
                predicates += criteria.equal(root.get<Any>("employee").get<Any>("id"), it)
            }
            filter.vacationTypeId?.let {
                predicates += criteria.equal(root.get<Any>("vacationType").get<Any>("id"), it)
            }
            filter.status?.let { predicates += criteria.equal(root.get<Any>("status"), it) }
            filter.urgent?.let { predicates += criteria.equal(root.get<Any>("urgent"), it) }
            filter.priority?.let { predicates += criteria.equal(root.get<Any>("priority"), it) }
            filter.archived?.let { predicates += criteria.equal(root.get<Any>("archived"), it) }
            filter.tag?.let { predicates += criteria.isMember(it, root.get("tags")) }
            filter.startDateFrom?.let {
                predicates += criteria.greaterThanOrEqualTo(root.get("startDate"), it)
            }
            filter.startDateTo?.let {
                predicates += criteria.lessThanOrEqualTo(root.get("startDate"), it)
            }
            filter.daysCount?.let { days ->
                val path = root.get<Int>("daysCount")
                predicates +=
                    when (filter.daysCountOperator) {
                        ComparisonOperator.EQ -> criteria.equal(path, days)
                        ComparisonOperator.GT -> criteria.greaterThan(path, days)
                        ComparisonOperator.GTE -> criteria.greaterThanOrEqualTo(path, days)
                        ComparisonOperator.LT -> criteria.lessThan(path, days)
                        ComparisonOperator.LTE -> criteria.lessThanOrEqualTo(path, days)
                    }
            }

            criteria.and(*predicates.toTypedArray())
        }
}
