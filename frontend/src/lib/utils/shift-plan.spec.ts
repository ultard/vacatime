import { describe, expect, it } from 'vitest';
import { applyTemplate, buildRequest, copyDay, emptyDraft, parseDraft, validatePlan, weekdayIndex } from './shift-plan.ts';

describe('shift plan helpers', () => {
	it('uses Monday-based weekdays', () => {
		expect(weekdayIndex('2026-10-05')).toBe(0); // Monday
		expect(weekdayIndex('2026-10-11')).toBe(6); // Sunday
	});

	it('applies a week template to the whole range', () => {
		const draft = emptyDraft('2026-10-05', '2026-10-14');
		draft.template[0] = { s1: { minimumStaff: 2, employeeIds: ['a'] } };
		const days = applyTemplate(draft);
		expect(Object.keys(days).sort()).toEqual(['2026-10-05', '2026-10-12']);
		days['2026-10-05'].s1.employeeIds.push('b');
		expect(days['2026-10-12'].s1.employeeIds).toEqual(['a']);
	});

	it('copies a day without sharing references', () => {
		const days = copyDay({ d1: { s1: { minimumStaff: 1, employeeIds: ['a'] } } }, 'd1', ['d2', 'd3']);
		expect(days.d3.s1).toEqual({ minimumStaff: 1, employeeIds: ['a'] });
		expect(days.d3.s1).not.toBe(days.d1.s1);
	});

	it('mirrors backend validation', () => {
		const draft = emptyDraft('2026-10-04', '2026-10-05');
		draft.days['2026-10-05'] = {
			s1: { minimumStaff: 1, employeeIds: ['a'] },
			s2: { minimumStaff: 1, employeeIds: ['a', 'b'] }
		};
		const issues = validatePlan(draft, '2026-10-05');
		expect(issues).toEqual([
			{ date: '2026-10-04', shiftIds: [], kind: 'past-date' },
			{ date: '2026-10-05', shiftIds: ['s1', 's2'], employeeId: 'a', kind: 'employee-twice' }
		]);
	});

	it('builds a full replacement request and drops inactive shifts', () => {
		const draft = emptyDraft('2026-10-05', '2026-10-06');
		draft.days['2026-10-05'] = {
			s1: { minimumStaff: 1.7, employeeIds: ['a', 'a'] },
			gone: { minimumStaff: 1, employeeIds: [] }
		};
		expect(buildRequest(draft, new Set(['s1']))).toEqual({
			days: [
				{ date: '2026-10-05', shifts: [{ shiftId: 's1', minimumStaff: 1, employeeIds: ['a'] }] },
				{ date: '2026-10-06', shifts: [] }
			]
		});
	});

	it('parses stored drafts defensively', () => {
		expect(parseDraft('nope')).toBeNull();
		expect(parseDraft(JSON.stringify(emptyDraft('a', 'b')))).toEqual(emptyDraft('a', 'b'));
	});
});
