import type { ShiftPlanRequest } from '#lib/api/types.ts';
import { eachDay, parseIso } from './date.ts';

export interface CellPlan {
	minimumStaff: number;
	employeeIds: string[];
}

/** date → shiftId → plan. A missing shift on a date means "not planned". */
export type PlanDays = Record<string, Record<string, CellPlan>>;

/** weekday (0 = Monday … 6 = Sunday) → shiftId → plan */
export type WeekTemplate = Record<number, Record<string, CellPlan>>;

export interface PlanDraft {
	from: string;
	to: string;
	days: PlanDays;
	template: WeekTemplate;
}

export const MAX_PLAN_DAYS = 366;
export const GRID_MAX_DAYS = 31;

/** Monday-based weekday index. */
export function weekdayIndex(iso: string): number {
	return (parseIso(iso).getDay() + 6) % 7;
}

export function emptyDraft(from: string, to: string): PlanDraft {
	return { from, to, days: {}, template: {} };
}

export function cloneCell(cell: CellPlan): CellPlan {
	return { minimumStaff: cell.minimumStaff, employeeIds: [...cell.employeeIds] };
}

/** Fill every day of the range from the week template (template wins over existing cells). */
export function applyTemplate(draft: PlanDraft): PlanDays {
	const days: PlanDays = { ...draft.days };
	for (const date of eachDay(draft.from, draft.to)) {
		const template = draft.template[weekdayIndex(date)];
		if (!template) continue;
		days[date] = Object.fromEntries(Object.entries(template).map(([shiftId, cell]) => [shiftId, cloneCell(cell)]));
	}
	return days;
}

/** Copy one day's plan to other dates. */
export function copyDay(days: PlanDays, source: string, targets: string[]): PlanDays {
	const plan = days[source] ?? {};
	const next = { ...days };
	for (const target of targets) {
		if (target === source) continue;
		next[target] = Object.fromEntries(Object.entries(plan).map(([shiftId, cell]) => [shiftId, cloneCell(cell)]));
	}
	return next;
}

export interface PlanIssue {
	date: string;
	shiftIds: string[];
	employeeId?: string;
	kind: 'employee-twice' | 'past-date';
}

/** Client-side mirror of ShiftPlanService.replace rules. */
export function validatePlan(draft: PlanDraft, today: string): PlanIssue[] {
	const issues: PlanIssue[] = [];
	for (const date of eachDay(draft.from, draft.to)) {
		if (date < today) issues.push({ date, shiftIds: [], kind: 'past-date' });
		const seen = new Map<string, string>();
		for (const [shiftId, cell] of Object.entries(draft.days[date] ?? {})) {
			for (const employeeId of cell.employeeIds) {
				const other = seen.get(employeeId);
				if (other) issues.push({ date, shiftIds: [other, shiftId], employeeId, kind: 'employee-twice' });
				else seen.set(employeeId, shiftId);
			}
		}
	}
	return issues;
}

/** Request for PUT /api/admin/shift-plans. Every date of the range is sent, so unplanned dates are cleared. */
export function buildRequest(draft: PlanDraft, activeShiftIds: Set<string>): ShiftPlanRequest {
	return {
		days: eachDay(draft.from, draft.to).map((date) => ({
			date,
			shifts: Object.entries(draft.days[date] ?? {})
				.filter(([shiftId]) => activeShiftIds.has(shiftId))
				.map(([shiftId, cell]) => ({
					shiftId,
					minimumStaff: Math.max(0, Math.floor(cell.minimumStaff)),
					employeeIds: [...new Set(cell.employeeIds)]
				}))
		}))
	};
}

/** Persisted draft (localStorage) parsing, tolerant to garbage. */
export function parseDraft(raw: string | null): PlanDraft | null {
	if (!raw) return null;
	try {
		const value = JSON.parse(raw) as PlanDraft;
		if (typeof value?.from === 'string' && typeof value?.to === 'string' && value.days && value.template) return value;
	} catch {
		// ignore
	}
	return null;
}
