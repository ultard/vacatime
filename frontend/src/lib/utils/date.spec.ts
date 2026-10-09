import { describe, expect, it } from 'vitest';
import { addDays, diffDays, eachDay, inclusiveDays, isWeekend, previewPriority, toIso } from './date.ts';

describe('date utils', () => {
	it('does calendar math on ISO dates', () => {
		expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
		expect(diffDays('2026-03-01', '2026-02-27')).toBe(-2);
		expect(inclusiveDays('2026-07-01', '2026-07-14')).toBe(14);
		expect(eachDay('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
		expect(toIso(new Date(2026, 0, 5))).toBe('2026-01-05');
	});

	it('survives DST changes', () => {
		expect(inclusiveDays('2026-03-28', '2026-03-30')).toBe(3);
		expect(inclusiveDays('2026-10-24', '2026-10-26')).toBe(3);
	});

	it('detects weekends', () => {
		expect(isWeekend('2026-10-03')).toBe(true);
		expect(isWeekend('2026-10-05')).toBe(false);
	});

	it('mirrors the backend priority rule', () => {
		expect(previewPriority(3, false)).toBe('LOW');
		expect(previewPriority(4, false)).toBe('NORMAL');
		expect(previewPriority(21, false)).toBe('HIGH');
		expect(previewPriority(2, true)).toBe('HIGH');
	});
});
