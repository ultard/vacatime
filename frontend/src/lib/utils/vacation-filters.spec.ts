import { describe, expect, it } from 'vitest';
import { countFilters, DEFAULT_STATE, exportQuery, readState, toListParams, writeState } from './vacation-filters.ts';

describe('vacation URL state', () => {
	it('round-trips through the URL', () => {
		const state = {
			...DEFAULT_STATE,
			search: 'море',
			status: 'PENDING' as const,
			urgent: true,
			archived: 'all' as const,
			startDateFrom: '2026-07-01',
			daysCount: 7,
			daysCountOperator: 'GT' as const,
			page: 2,
			sort: 'startDate' as const,
			direction: 'ASC' as const
		};
		const url = writeState(state);
		expect(readState(new URLSearchParams(url))).toEqual(state);
	});

	it('omits defaults and ignores garbage', () => {
		expect(writeState(DEFAULT_STATE)).toBe('');
		const state = readState(new URLSearchParams('status=NOPE&size=33&page=-1&from=yesterday&employee=1'));
		expect(state).toEqual(DEFAULT_STATE);
	});

	it('maps archived mode and counts filters', () => {
		const hidden = readState(new URLSearchParams(''));
		expect(toListParams(hidden).archived).toBe(false);
		expect(toListParams(readState(new URLSearchParams('archived=only'))).archived).toBe(true);
		expect(toListParams(readState(new URLSearchParams('archived=all'))).archived).toBeUndefined();
		expect(countFilters(readState(new URLSearchParams('status=DRAFT&urgent=false&q=x')))).toBe(2);
	});

	it('builds the export query with backend names', () => {
		expect(exportQuery(readState(new URLSearchParams('q=sea&type=00000000-0000-0000-0000-000000000001')))).toBe(
			'search=sea&vacationTypeId=00000000-0000-0000-0000-000000000001&archived=false'
		);
	});
});

describe('filter presets', async () => {
	const { clearFilters, PRESETS, togglePreset } = await import('./vacation-filters.ts');
	const today = '2026-10-06';
	const active = (s: Parameters<typeof togglePreset>[0]) =>
		(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).filter((id) => PRESETS[id].isActive(s, today));

	it('toggles a preset on and off', () => {
		const on = togglePreset(DEFAULT_STATE, 'urgent', today);
		expect(on.urgent).toBe(true);
		expect(active(on)).toEqual(['urgent']);
		const off = togglePreset(on, 'urgent', today);
		expect(off).toEqual(DEFAULT_STATE);
	});

	it('combines presets on different fields', () => {
		let s = togglePreset(DEFAULT_STATE, 'drafts', today);
		s = togglePreset(s, 'urgent', today);
		s = togglePreset(s, 'upcoming', today);
		expect(active(s)).toEqual(['drafts', 'urgent', 'upcoming']);
		expect(s).toMatchObject({ status: 'DRAFT', urgent: true, startDateFrom: today, sort: 'startDate', direction: 'ASC' });
		s = togglePreset(s, 'urgent', today);
		expect(active(s)).toEqual(['drafts', 'upcoming']);
	});

	it('status presets replace each other', () => {
		const s = togglePreset(togglePreset(DEFAULT_STATE, 'drafts', today), 'pending', today);
		expect(s.status).toBe('PENDING');
		expect(active(s)).toEqual(['pending']);
	});

	it('removing "upcoming" restores the default sort only if it set it', () => {
		const on = togglePreset(DEFAULT_STATE, 'upcoming', today);
		expect(togglePreset(on, 'upcoming', today)).toEqual(DEFAULT_STATE);
		const custom = { ...on, sort: 'daysCount' as const, direction: 'DESC' as const };
		expect(togglePreset(custom, 'upcoming', today)).toMatchObject({ startDateFrom: '', sort: 'daysCount' });
	});

	it('archive switches between archived-only and hidden, and resets the page', () => {
		const on = togglePreset({ ...DEFAULT_STATE, page: 3 }, 'archive', today);
		expect(on).toMatchObject({ archived: 'only', page: 0 });
		expect(togglePreset(on, 'archive', today).archived).toBe('hide');
	});

	it('"All" clears filters — also when merged onto the current state — but keeps search, sort and size', () => {
		const s = {
			...DEFAULT_STATE,
			search: 'море',
			size: 50,
			sort: 'daysCount' as const,
			status: 'DRAFT' as const,
			urgent: true,
			priority: 'HIGH' as const,
			daysCount: 5,
			tag: 'x',
			archived: 'only' as const
		};
		const cleared = { ...s, ...clearFilters(s) };
		expect(countFilters(cleared)).toBe(0);
		expect(writeState(cleared)).toBe('?q=%D0%BC%D0%BE%D1%80%D0%B5&size=50&sort=daysCount');
	});
});
