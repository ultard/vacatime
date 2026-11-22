import type { VacationDto, VacationStatus } from '#lib/api/types.ts';

/** Mirror of VacationService.checkStatusTransition. */
export function canApprove(vacation: Pick<VacationDto, 'status' | 'archived'>): boolean {
	return !vacation.archived && vacation.status !== 'REJECTED' && vacation.status !== 'CANCELLED';
}

export function canMoveTo(vacation: Pick<VacationDto, 'status' | 'archived'>, target: VacationStatus): boolean {
	if (target === vacation.status) return false;
	return target !== 'APPROVED' || canApprove(vacation);
}
