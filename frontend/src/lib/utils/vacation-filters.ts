import {
	COMPARISON_OPERATORS,
	PRIORITIES,
	VACATION_SORTS,
	VACATION_STATUSES,
	type ComparisonOperator,
	type VacationPriority,
	type VacationSort,
	type VacationStatus
} from '#lib/api/types.ts';
import type { VacationListParams } from '#lib/schemas/vacation.ts';

/** `archived` in the URL: hidden by default, `only` → archived only, `all` → no filter. */
export type ArchivedMode = 'hide' | 'only' | 'all';

export interface VacationUrlState {
	search: string;
	status?: VacationStatus;
	vacationTypeId?: string;
	employeeId?: string;
	priority?: VacationPriority;
	urgent?: boolean;
	tag: string;
	archived: ArchivedMode;
	startDateFrom: string;
	startDateTo: string;
	daysCount?: number;
	daysCountOperator: ComparisonOperator;
	page: number;
	size: number;
	sort: VacationSort;
	direction: 'ASC' | 'DESC';
}

export const DEFAULT_STATE: VacationUrlState = {
	search: '',
	tag: '',
	archived: 'hide',
	startDateFrom: '',
	startDateTo: '',
	daysCountOperator: 'GTE',
	page: 0,
	size: 20,
	sort: 'createdAt',
	direction: 'DESC'
};

const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const oneOf = <T extends string>(list: readonly T[], value: string | null): T | undefined =>
	value && (list as readonly string[]).includes(value) ? (value as T) : undefined;

export function readState(params: Pick<URLSearchParams, "get">): VacationUrlState {
	const int = (key: string, min: number, max: number) => {
		const value = Number(params.get(key));
		return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
	};
	const date = (key: string) => (DATE.test(params.get(key) ?? '') ? params.get(key)! : '');
	const uuid = (key: string) => (UUID.test(params.get(key) ?? '') ? params.get(key)! : undefined);
	const urgent = params.get('urgent');
	return {
		search: params.get('q')?.slice(0, 200) ?? '',
		status: oneOf(VACATION_STATUSES, params.get('status')),
		vacationTypeId: uuid('type'),
		employeeId: uuid('employee'),
		priority: oneOf(PRIORITIES, params.get('priority')),
		urgent: urgent === 'true' ? true : urgent === 'false' ? false : undefined,
		tag: params.get('tag')?.slice(0, 100) ?? '',
		archived: oneOf(['hide', 'only', 'all'] as const, params.get('archived')) ?? 'hide',
		startDateFrom: date('from'),
		startDateTo: date('to'),
		daysCount: int('days', 1, 10000),
		daysCountOperator: oneOf(COMPARISON_OPERATORS, params.get('daysOp')) ?? 'GTE',
		page: int('page', 0, 100000) ?? 0,
		size: ([20, 50, 100] as const).find((s) => s === int('size', 1, 100)) ?? 20,
		sort: oneOf(VACATION_SORTS, params.get('sort')) ?? 'createdAt',
		direction: params.get('dir') === 'ASC' ? 'ASC' : 'DESC'
	};
}

/** Serialise only non-default values, so URLs stay short and shareable. */
export function writeState(state: Partial<VacationUrlState>): string {
	const s = { ...DEFAULT_STATE, ...state };
	const params = new URLSearchParams();
	const set = (key: string, value: unknown, fallback?: unknown) => {
		if (value === undefined || value === '' || value === fallback) return;
		params.set(key, String(value));
	};
	set('q', s.search.trim());
	set('status', s.status);
	set('type', s.vacationTypeId);
	set('employee', s.employeeId);
	set('priority', s.priority);
	set('urgent', s.urgent);
	set('tag', s.tag.trim());
	set('archived', s.archived, 'hide');
	set('from', s.startDateFrom);
	set('to', s.startDateTo);
	set('days', s.daysCount);
	if (s.daysCount !== undefined) set('daysOp', s.daysCountOperator, 'GTE');
	set('page', s.page, 0);
	set('size', s.size, 20);
	set('sort', s.sort, 'createdAt');
	set('dir', s.direction, 'DESC');
	const query = params.toString();
	return query ? `?${query}` : '';
}

/** The API filter for a URL state (without paging). */
export function toFilter(state: VacationUrlState): Omit<VacationListParams, 'page' | 'size' | 'sort' | 'direction'> {
	return {
		search: state.search.trim() || undefined,
		status: state.status,
		vacationTypeId: state.vacationTypeId,
		employeeId: state.employeeId,
		priority: state.priority,
		urgent: state.urgent,
		tag: state.tag.trim() || undefined,
		archived: state.archived === 'all' ? undefined : state.archived === 'only',
		startDateFrom: state.startDateFrom || undefined,
		startDateTo: state.startDateTo || undefined,
		daysCount: state.daysCount,
		daysCountOperator: state.daysCount !== undefined ? state.daysCountOperator : undefined
	};
}

export function toListParams(state: VacationUrlState): VacationListParams {
	return { ...toFilter(state), page: state.page, size: state.size, sort: state.sort, direction: state.direction };
}

/** Number of active filters, for the "Filters (n)" badge. */
export function countFilters(state: VacationUrlState): number {
	return [
		state.status,
		state.vacationTypeId,
		state.employeeId,
		state.priority,
		state.urgent,
		state.tag || undefined,
		state.archived !== 'hide' ? true : undefined,
		state.startDateFrom || undefined,
		state.startDateTo || undefined,
		state.daysCount
	].filter((value) => value !== undefined).length;
}

/** Query string for the API CSV export (same param names as the backend expects). */
export function exportQuery(state: VacationUrlState): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(toFilter(state))) {
		if (value !== undefined && value !== '') params.set(key, String(value));
	}
	return params.toString();
}

export type PresetId = 'pending' | 'drafts' | 'urgent' | 'upcoming' | 'archive';

interface Preset {
	isActive(state: VacationUrlState, today: string): boolean;
	apply(state: VacationUrlState, today: string): Partial<VacationUrlState>;
	clear(state: VacationUrlState): Partial<VacationUrlState>;
}

/**
 * Quick-filter chips. Each one owns a few fields: clicking an inactive chip sets them on top of the
 * current filters (chips on different fields combine), clicking an active chip clears them again.
 * "Pending" and "Drafts" share the status field, so choosing one replaces the other.
 */
export const PRESETS: Record<PresetId, Preset> = {
	pending: {
		isActive: (s) => s.status === 'PENDING',
		apply: () => ({ status: 'PENDING' }),
		clear: () => ({ status: undefined })
	},
	drafts: {
		isActive: (s) => s.status === 'DRAFT',
		apply: () => ({ status: 'DRAFT' }),
		clear: () => ({ status: undefined })
	},
	urgent: {
		isActive: (s) => s.urgent === true,
		apply: () => ({ urgent: true }),
		clear: () => ({ urgent: undefined })
	},
	upcoming: {
		isActive: (s, today) => s.startDateFrom === today,
		apply: (_, today) => ({ startDateFrom: today, sort: 'startDate', direction: 'ASC' }),
		// Drop the sort the chip introduced, but keep one the user picked themselves.
		clear: (s) =>
			s.sort === 'startDate' && s.direction === 'ASC'
				? { startDateFrom: '', sort: DEFAULT_STATE.sort, direction: DEFAULT_STATE.direction }
				: { startDateFrom: '' }
	},
	archive: {
		isActive: (s) => s.archived === 'only',
		apply: () => ({ archived: 'only' }),
		clear: () => ({ archived: 'hide' })
	}
};

export function togglePreset(state: VacationUrlState, id: PresetId, today: string): VacationUrlState {
	const preset = PRESETS[id];
	const patch = preset.isActive(state, today) ? preset.clear(state) : preset.apply(state, today);
	return { ...state, ...patch, page: 0 };
}

/** Every optional filter set explicitly to "unset", so the result also clears them when merged. */
const UNSET_FILTERS = {
	status: undefined,
	vacationTypeId: undefined,
	employeeId: undefined,
	priority: undefined,
	urgent: undefined,
	daysCount: undefined
} satisfies Partial<VacationUrlState>;

/** "All" / "Reset": drop every filter, keep the search text, sort and page size. */
export function clearFilters(state: VacationUrlState): VacationUrlState {
	return {
		...DEFAULT_STATE,
		...UNSET_FILTERS,
		search: state.search,
		size: state.size,
		sort: state.sort,
		direction: state.direction
	};
}
