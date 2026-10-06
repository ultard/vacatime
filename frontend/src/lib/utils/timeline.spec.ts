import { describe, expect, it } from 'vitest';
import type { VacationDto } from '#lib/api/types.ts';
import { layoutTimeline, monthSegments, shiftWindow, windowFor } from './timeline.ts';

const vac = (id: string, employee: string, startDate: string, endDate: string): VacationDto =>
	({
		id,
		employee: { id: employee, fullName: employee },
		startDate,
		endDate,
		daysCount: (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1
	}) as VacationDto;

describe('timeline windows', () => {
	it('aligns to month / quarter / year', () => {
		expect(windowFor('2026-10-05', 'month')).toEqual({ from: '2026-10-01', to: '2026-10-31', days: 31 });
		expect(windowFor('2026-11-20', 'quarter')).toEqual({ from: '2026-10-01', to: '2026-12-31', days: 92 });
		expect(windowFor('2028-06-01', 'year').days).toBe(366);
		expect(shiftWindow('2026-12-15', 'month', 1)).toBe('2027-01-01');
		expect(shiftWindow('2026-01-15', 'quarter', -1)).toBe('2025-10-01');
	});

	it('splits the header into months', () => {
		const segments = monthSegments(windowFor('2026-11-01', 'quarter'));
		expect(segments.map((s) => [s.offset, s.span])).toEqual([
			[0, 31],
			[31, 30],
			[61, 31]
		]);
	});
});

describe('layoutTimeline', () => {
	const window = windowFor('2026-10-01', 'month');

	it('keeps only vacations that intersect the window and clips edges', () => {
		const rows = layoutTimeline(
			[vac('a', 'Ann', '2026-09-25', '2026-10-03'), vac('b', 'Ann', '2026-11-02', '2026-11-05')],
			window
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].bars).toHaveLength(1);
		expect(rows[0].bars[0]).toMatchObject({ offset: -6, span: 9, clippedStart: true, clippedEnd: false });
	});

	it('stacks overlapping bars into lanes per employee', () => {
		const rows = layoutTimeline(
			[
				vac('a', 'Bob', '2026-10-01', '2026-10-10'),
				vac('b', 'Bob', '2026-10-05', '2026-10-07'),
				vac('c', 'Bob', '2026-10-11', '2026-10-12'),
				vac('d', 'Ann', '2026-10-05', '2026-10-07')
			],
			window
		);
		expect(rows.map((r) => r.fullName)).toEqual(['Ann', 'Bob']);
		const bob = rows[1];
		expect(bob.lanes).toBe(2);
		expect(bob.bars.map((b) => [b.vacation.id, b.lane])).toEqual([
			['a', 0],
			['b', 1],
			['c', 0]
		]);
	});
});
