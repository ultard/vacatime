import { describe, expect, it } from 'vitest';
import type { AvailabilityDto, ShiftDayAvailabilityDto } from '#lib/api/types.ts';
import { dayLevel, summarizeShortages } from './availability.ts';

const day = (patch: Partial<ShiftDayAvailabilityDto>): ShiftDayAvailabilityDto => ({
	date: '2026-10-05',
	planned: true,
	minimumStaff: 2,
	scheduledStaff: 3,
	approvedAbsent: 0,
	pendingAbsent: 0,
	availableAfterApproved: 3,
	forecastAvailable: 3,
	confirmedShortage: false,
	forecastShortage: false,
	...patch
});

describe('availability helpers', () => {
	it('buckets days', () => {
		expect(dayLevel(day({ planned: false }))).toBe('unplanned');
		expect(dayLevel(day({}))).toBe('ok');
		expect(dayLevel(day({ forecastAvailable: 2 }))).toBe('tight');
		expect(dayLevel(day({ forecastShortage: true }))).toBe('forecast');
		expect(dayLevel(day({ forecastShortage: true, confirmedShortage: true }))).toBe('confirmed');
	});

	it('summarizes shortages worst first', () => {
		const data: AvailabilityDto = {
			from: '2026-10-05',
			to: '2026-10-06',
			departments: [
				{
					id: 'd',
					name: 'D',
					shifts: [
						{ id: 'a', name: 'A', days: [day({ forecastShortage: true }), day({})] },
						{ id: 'b', name: 'B', days: [day({ confirmedShortage: true, forecastShortage: true })] },
						{ id: 'c', name: 'C', days: [day({})] }
					]
				}
			]
		};
		expect(summarizeShortages(data).map((r) => [r.shiftId, r.confirmed, r.forecast])).toEqual([
			['b', 1, 1],
			['a', 0, 1]
		]);
	});
});

describe('clampRange', () => {
	it('keeps the range inside API limits', async () => {
		const { clampRange } = await import('./availability.ts');
		expect(clampRange(null, null, '2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-18' });
		expect(clampRange('2026-01-01', '2026-01-02', '2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-18' });
		expect(clampRange('2026-10-10', '2028-01-01', '2026-10-05')).toEqual({ from: '2026-10-10', to: '2027-10-10' });
	});
});
