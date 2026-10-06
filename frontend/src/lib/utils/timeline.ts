import type { VacationDto } from '#lib/api/types.ts';
import { addDays, diffDays, parseIso, toIso } from './date.ts';

export type Zoom = 'month' | 'quarter' | 'year';

export const DAY_WIDTH: Record<Zoom, number> = { month: 36, quarter: 14, year: 4 };

export interface TimelineWindow {
	from: string;
	to: string;
	days: number;
}

/** Window that contains `anchor`, aligned to the start of the month/quarter/year. */
export function windowFor(anchor: string, zoom: Zoom): TimelineWindow {
	const date = parseIso(anchor);
	let start: Date;
	let end: Date;
	if (zoom === 'month') {
		start = new Date(date.getFullYear(), date.getMonth(), 1);
		end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
	} else if (zoom === 'quarter') {
		const q = Math.floor(date.getMonth() / 3) * 3;
		start = new Date(date.getFullYear(), q, 1);
		end = new Date(date.getFullYear(), q + 3, 0);
	} else {
		start = new Date(date.getFullYear(), 0, 1);
		end = new Date(date.getFullYear(), 11, 31);
	}
	const from = toIso(start);
	const to = toIso(end);
	return { from, to, days: diffDays(from, to) + 1 };
}

export function shiftWindow(anchor: string, zoom: Zoom, direction: -1 | 1): string {
	const date = parseIso(anchor);
	if (zoom === 'month') date.setMonth(date.getMonth() + direction, 1);
	else if (zoom === 'quarter') date.setMonth(date.getMonth() + 3 * direction, 1);
	else date.setFullYear(date.getFullYear() + direction, 0, 1);
	return toIso(date);
}

export interface TimelineBar {
	vacation: VacationDto;
	/** Day offset from the window start (may be negative when it started earlier). */
	offset: number;
	span: number;
	lane: number;
	clippedStart: boolean;
	clippedEnd: boolean;
}

export interface TimelineRow {
	employeeId: string;
	fullName: string;
	lanes: number;
	bars: TimelineBar[];
}

/**
 * Group vacations by employee and assign lanes so overlapping bars never cover each other.
 * Only vacations intersecting the window are kept.
 */
export function layoutTimeline(vacations: VacationDto[], window: TimelineWindow): TimelineRow[] {
	const rows = new Map<string, TimelineRow>();
	const visible = vacations
		.filter((v) => v.endDate >= window.from && v.startDate <= window.to)
		.sort((a, b) => a.startDate.localeCompare(b.startDate) || b.daysCount - a.daysCount);

	for (const vacation of visible) {
		let row = rows.get(vacation.employee.id);
		if (!row) {
			row = { employeeId: vacation.employee.id, fullName: vacation.employee.fullName, lanes: 1, bars: [] };
			rows.set(vacation.employee.id, row);
		}
		const offset = diffDays(window.from, vacation.startDate);
		const span = vacation.daysCount;
		let lane = 0;
		while (row.bars.some((b) => b.lane === lane && b.offset < offset + span && offset < b.offset + b.span)) lane++;
		row.lanes = Math.max(row.lanes, lane + 1);
		row.bars.push({
			vacation,
			offset,
			span,
			lane,
			clippedStart: vacation.startDate < window.from,
			clippedEnd: vacation.endDate > window.to
		});
	}
	return [...rows.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
}

/** Month segments for the header. */
export function monthSegments(window: TimelineWindow): { label: Date; offset: number; span: number }[] {
	const segments: { label: Date; offset: number; span: number }[] = [];
	let cursor = window.from;
	while (cursor <= window.to) {
		const date = parseIso(cursor);
		const monthEnd = toIso(new Date(date.getFullYear(), date.getMonth() + 1, 0));
		const end = monthEnd < window.to ? monthEnd : window.to;
		segments.push({ label: date, offset: diffDays(window.from, cursor), span: diffDays(cursor, end) + 1 });
		cursor = addDays(end, 1);
	}
	return segments;
}
