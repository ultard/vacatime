import type { AvailabilityDto, ShiftDayAvailabilityDto } from '#lib/api/types.ts';

export interface ShortageRow {
	departmentId: string;
	departmentName: string;
	shiftId: string;
	shiftName: string;
	confirmed: number;
	forecast: number;
}

/** Shifts with at least one (confirmed or forecast) shortage day, worst first. */
export function summarizeShortages(data: AvailabilityDto): ShortageRow[] {
	const rows: ShortageRow[] = [];
	for (const department of data.departments) {
		for (const shift of department.shifts) {
			const confirmed = shift.days.filter((d) => d.confirmedShortage).length;
			const forecast = shift.days.filter((d) => d.forecastShortage).length;
			if (confirmed || forecast) {
				rows.push({
					departmentId: department.id,
					departmentName: department.name,
					shiftId: shift.id,
					shiftName: shift.name,
					confirmed,
					forecast
				});
			}
		}
	}
	return rows.sort((a, b) => b.confirmed - a.confirmed || b.forecast - a.forecast);
}

export type DayLevel = 'unplanned' | 'ok' | 'tight' | 'forecast' | 'confirmed';

/** Heat-map bucket for a planned shift day. */
export function dayLevel(day: ShiftDayAvailabilityDto): DayLevel {
	if (!day.planned) return 'unplanned';
	if (day.confirmedShortage) return 'confirmed';
	if (day.forecastShortage) return 'forecast';
	if ((day.forecastAvailable ?? 0) - (day.minimumStaff ?? 0) === 0) return 'tight';
	return 'ok';
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Clamp a requested range to what the API accepts: from ≥ today, to ≥ from, ≤ 365 days. */
export function clampRange(from: string | null, to: string | null, today: string): { from: string; to: string } {
	const start = from && ISO.test(from) && from >= today ? from : today;
	const maxEnd = addDaysIso(start, 365);
	let end = to && ISO.test(to) && to >= start ? to : addDaysIso(start, 13);
	if (end > maxEnd) end = maxEnd;
	return { from: start, to: end };
}

function addDaysIso(iso: string, days: number): string {
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d + days));
	return date.toISOString().slice(0, 10);
}
