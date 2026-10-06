/**
 * In-memory stand-in for the Vacatime Spring API, used by Playwright e2e tests and offline demos.
 * Implements the contract described in docs/frontend-sveltekit3/research.md: same routes, DTOs,
 * business rules (overlaps, optimistic locking, priority, approval rules, forced password change)
 * and the same ApiError format. It is not a copy of the backend — just enough for UI scenarios.
 *
 *   bun mock-api/server.ts            # port 8099 (MOCK_PORT to override)
 *   POST /__reset                     # restore fixtures between tests
 */
import { fixtures, type State } from './fixtures.ts';

type Json = Record<string, unknown>;
type Role = 'VIEWER' | 'EDITOR' | 'ADMIN';
type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
const ACTIVE: Status[] = ['DRAFT', 'PENDING', 'APPROVED'];
const PORT = Number(process.env.MOCK_PORT ?? 8099);

let state: State = fixtures();

// ------------------------------------------------------------------ helpers

class HttpError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public fieldErrors: Record<string, string> = {}
	) {
		super(message);
	}
}
const fail = (status: number, code: string, message: string, fieldErrors?: Record<string, string>): never => {
	throw new HttpError(status, code, message, fieldErrors);
};
const notFound = (what: string) => fail(404, 'NOT_FOUND', `${what} not found`);
const conflict = (message: string) => fail(409, 'CONFLICT', message);
const badRequest = () => fail(400, 'VALIDATION_ERROR', 'Invalid request parameters or body');

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;

function jwt(userId: string, roles: Role[]) {
	const payload = { sub: userId, roles, exp: Math.floor(Date.now() / 1000) + 15 * 60 };
	return `mock.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${uuid().slice(0, 8)}`;
}

function issueTokens(userId: string) {
	const user = state.users.find((u) => u.id === userId)!;
	const accessToken = jwt(user.id, user.roles);
	const refreshToken = uuid() + uuid();
	state.access.set(accessToken, user.id);
	state.refresh.set(refreshToken, user.id);
	return { accessToken, refreshToken, mustChangePassword: user.mustChangePassword };
}

const userDto = (u: State['users'][number]) => ({
	id: u.id,
	login: u.login,
	fullName: u.fullName,
	roles: u.roles,
	active: u.active,
	mustChangePassword: u.mustChangePassword
});

function vacationDto(v: State['vacations'][number]) {
	const employee = state.users.find((u) => u.id === v.employeeId)!;
	const type = state.types.find((t) => t.id === v.vacationTypeId)!;
	return { ...v, employee: userDto(employee), vacationType: type, employeeId: undefined, vacationTypeId: undefined };
}

function audit(actor: string | null, eventType: string, entityType: string, entityId: string | null, description = '') {
	state.audit.unshift({ id: uuid(), userId: actor, eventType, entityType, entityId, correlationId: uuid(), description, createdAt: now() });
}

function page<T>(items: T[], pageNumber: number, size: number) {
	const s = Math.min(Math.max(size, 1), 100);
	return {
		content: items.slice(pageNumber * s, pageNumber * s + s),
		page: pageNumber,
		size: s,
		totalElements: items.length,
		totalPages: Math.ceil(items.length / s)
	};
}

function priority(daysCount: number, urgent: boolean) {
	if (urgent || daysCount > 20) return 'HIGH';
	if (daysCount <= 3) return 'LOW';
	return 'NORMAL';
}

function overlaps(employeeId: string, id: string, start: string, end: string) {
	return state.vacations.some(
		(v) => v.id !== id && v.employeeId === employeeId && !v.archived && ACTIVE.includes(v.status) && v.startDate <= end && v.endDate >= start
	);
}

function validateVacation(v: State['vacations'][number]) {
	if (v.startDate > v.endDate) conflict('startDate must not be after endDate');
	v.daysCount = days(v.startDate, v.endDate);
	if (v.tags.length > 20 || v.tags.some((t) => !t.trim() || t.length > 100)) {
		fail(400, 'VALIDATION_ERROR', 'At most 20 nonblank tags, each at most 100 characters, are allowed');
	}
	if (!v.archived && ACTIVE.includes(v.status) && overlaps(v.employeeId, v.id, v.startDate, v.endDate)) {
		conflict('Employee has an overlapping active vacation');
	}
	v.priority = priority(v.daysCount, v.urgent);
}

function checkTransition(v: State['vacations'][number], target: Status) {
	if (target === 'APPROVED' && (v.archived || v.status === 'REJECTED' || v.status === 'CANCELLED')) {
		conflict('Vacation cannot be approved');
	}
}

function requireBody(body: Json, fields: string[]) {
	const errors: Record<string, string> = {};
	for (const f of fields) if (body[f] === undefined || body[f] === null || body[f] === '') errors[f] = 'must not be blank';
	if (Object.keys(errors).length) fail(400, 'VALIDATION_ERROR', 'Request validation failed', errors);
}

function filterVacations(q: URLSearchParams) {
	let list = [...state.vacations];
	const search = q.get('search')?.toLowerCase();
	if (search) {
		list = list.filter((v) => {
			const e = state.users.find((u) => u.id === v.employeeId)!;
			return [v.vacationNumber, v.title, v.description ?? '', e.fullName, e.login].some((s) => s.toLowerCase().includes(search));
		});
	}
	const eq = (key: string, get: (v: State['vacations'][number]) => unknown) => {
		const value = q.get(key);
		if (value !== null && value !== '') list = list.filter((v) => String(get(v)) === value);
	};
	eq('employeeId', (v) => v.employeeId);
	eq('vacationTypeId', (v) => v.vacationTypeId);
	eq('status', (v) => v.status);
	eq('urgent', (v) => v.urgent);
	eq('priority', (v) => v.priority);
	eq('archived', (v) => v.archived);
	const tag = q.get('tag');
	if (tag) list = list.filter((v) => v.tags.includes(tag));
	const from = q.get('startDateFrom');
	if (from) list = list.filter((v) => v.startDate >= from);
	const to = q.get('startDateTo');
	if (to) list = list.filter((v) => v.startDate <= to);
	const daysCount = q.get('daysCount');
	if (daysCount) {
		const n = Number(daysCount);
		const op = q.get('daysCountOperator') ?? 'EQ';
		const cmp = { EQ: (a: number) => a === n, GT: (a: number) => a > n, GTE: (a: number) => a >= n, LT: (a: number) => a < n, LTE: (a: number) => a <= n }[op];
		if (!cmp) badRequest();
		list = list.filter((v) => cmp!(v.daysCount));
	}
	return list;
}

const CSV_HEADERS = ['vacationNumber', 'employeeId', 'vacationTypeId', 'title', 'description', 'startDate', 'endDate', 'urgent', 'tags', 'status', 'version'];
const csvCell = (value: unknown) => {
	const s = String(value ?? '');
	return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
			else if (ch === '"') quoted = false;
			else cell += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === ',') row.push(cell), (cell = '');
		else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && text[i + 1] === '\n') i++;
			row.push(cell);
			if (row.some((c) => c !== '')) rows.push(row);
			row = [];
			cell = '';
		} else cell += ch;
	}
	row.push(cell);
	if (row.some((c) => c !== '')) rows.push(row);
	return rows;
}

function previewImport(csv: string, mode: string) {
	const rows = parseCsv(csv.replace(/^﻿/, ''));
	const header = rows.shift() ?? [];
	if (!CSV_HEADERS.every((h) => header.includes(h))) fail(400, 'VALIDATION_ERROR', `CSV must contain these headers: ${CSV_HEADERS.join(', ')}`);
	const validRows: Json[] = [];
	const invalidRows: Json[] = [];
	const seen = new Set<string>();
	rows.forEach((cells, index) => {
		const get = (h: string) => cells[header.indexOf(h)] ?? '';
		const rowNumber = index + 2;
		const vacationNumber = get('vacationNumber');
		try {
			if (!vacationNumber || vacationNumber.length > 80) throw new Error('vacationNumber must be nonblank and at most 80 characters');
			if (seen.has(vacationNumber)) throw new Error('Duplicate vacation number in CSV');
			seen.add(vacationNumber);
			if (!/^[0-9a-f-]{36}$/i.test(get('employeeId'))) throw new Error(`Invalid UUID string: ${get('employeeId')}`);
			if (!state.users.some((u) => u.id === get('employeeId'))) throw new Error('Employee not found');
			if (!state.types.some((t) => t.id === get('vacationTypeId'))) throw new Error('Vacation type not found');
			const request = {
				employeeId: get('employeeId'),
				vacationTypeId: get('vacationTypeId'),
				title: get('title'),
				description: get('description') || null,
				startDate: get('startDate'),
				endDate: get('endDate'),
				urgent: get('urgent') === 'true',
				tags: JSON.parse(get('tags') || '[]'),
				status: get('status'),
				version: get('version') ? Number(get('version')) : null
			};
			const existing = state.vacations.find((v) => v.vacationNumber === vacationNumber);
			if (existing && mode === 'CREATE_ONLY') throw new Error('Vacation number already exists');
			if (existing && request.version !== existing.version) throw new Error('Vacation version is stale');
			validRows.push({ rowNumber, vacationNumber, request, error: null });
		} catch (error) {
			invalidRows.push({ rowNumber, vacationNumber, request: null, error: (error as Error).message });
		}
	});
	return { validRows, invalidRows };
}

// ------------------------------------------------------------------ routing

interface Ctx {
	method: string;
	path: string;
	query: URLSearchParams;
	body: Json;
	userId: string | null;
}

type Handler = (ctx: Ctx, params: string[]) => unknown;
const routes: [string, RegExp, Handler, ('auth' | 'any' | 'editor' | 'admin')?][] = [];
const route = (method: string, pattern: string, handler: Handler, access: 'auth' | 'any' | 'editor' | 'admin' = 'any') =>
	routes.push([method, new RegExp(`^${pattern.replaceAll('{id}', '([^/]+)')}$`), handler, access]);

const me = (ctx: Ctx) => state.users.find((u) => u.id === ctx.userId)!;

// auth
route('POST', '/api/auth/login', ({ body }) => {
	requireBody(body, ['login', 'password']);
	const user = state.users.find((u) => u.login === body.login);
	if (!user) fail(401, 'UNAUTHORIZED', 'Invalid credentials');
	if (!user!.active) fail(401, 'UNAUTHORIZED', 'User is disabled');
	if (user!.lockedUntil && user!.lockedUntil > Date.now()) fail(401, 'UNAUTHORIZED', 'Account is temporarily locked');
	if (user!.password !== body.password) {
		user!.failed++;
		if (user!.failed >= 5) (user!.lockedUntil = Date.now() + 15 * 60_000), (user!.failed = 0);
		audit(user!.id, 'LOGIN_FAILED', 'USER', user!.id);
		fail(401, 'UNAUTHORIZED', 'Invalid credentials');
	}
	user!.failed = 0;
	audit(user!.id, 'LOGIN', 'USER', user!.id);
	return issueTokens(user!.id);
});
route('POST', '/api/auth/refresh', ({ body }) => {
	const userId = state.refresh.get(String(body.refreshToken));
	if (!userId) fail(401, 'UNAUTHORIZED', 'Invalid refresh token');
	state.refresh.delete(String(body.refreshToken));
	return issueTokens(userId!);
});
route('POST', '/api/auth/logout', (ctx) => {
	state.refresh.delete(String(ctx.body.refreshToken));
	audit(ctx.userId, 'LOGOUT', 'USER', ctx.userId);
}, 'auth');
route('GET', '/api/auth/me', (ctx) => userDto(me(ctx)), 'auth');
route('POST', '/api/auth/change-password', (ctx) => {
	const user = me(ctx);
	if (user.password !== ctx.body.oldPassword) fail(401, 'UNAUTHORIZED', 'Invalid password');
	const next = String(ctx.body.newPassword ?? '');
	if (next.length < 8 || next.length > 72) fail(400, 'VALIDATION_ERROR', 'Request validation failed', { newPassword: 'size must be between 8 and 72' });
	if (next === user.password) fail(403, 'FORBIDDEN', 'New password must differ from the old password');
	user.password = next;
	user.mustChangePassword = false;
	for (const [token, id] of state.refresh) if (id === user.id) state.refresh.delete(token);
	audit(user.id, 'CHANGE_PASSWORD', 'USER', user.id);
}, 'auth');

// vacations
const findVacation = (id: string) => state.vacations.find((v) => v.id === id) ?? notFound('Vacation');
route('GET', '/api/vacations', ({ query }) => {
	const sort = query.get('sort') ?? 'createdAt';
	if (!['createdAt', 'startDate', 'daysCount'].includes(sort)) fail(400, 'VALIDATION_ERROR', 'Invalid pagination or vacation sort field');
	const dir = query.get('direction') === 'ASC' ? 1 : -1;
	const list = filterVacations(query).sort((a, b) => {
		const av = a[sort as 'startDate'];
		const bv = b[sort as 'startDate'];
		return (av < bv ? -1 : av > bv ? 1 : a.id.localeCompare(b.id)) * dir;
	});
	const result = page(list, Number(query.get('page') ?? 0), Number(query.get('size') ?? 20));
	return { ...result, content: result.content.map(vacationDto) };
});
route('GET', '/api/vacations/export', ({ query }) => {
	const lines = [CSV_HEADERS.join(',')];
	for (const v of filterVacations(query)) {
		lines.push([v.vacationNumber, v.employeeId, v.vacationTypeId, v.title, v.description ?? '', v.startDate, v.endDate, v.urgent, JSON.stringify(v.tags), v.status, v.version].map(csvCell).join(','));
	}
	return new Response(lines.join('\n') + '\n', { headers: { 'content-type': 'text/csv;charset=UTF-8' } });
});
route('POST', '/api/vacations/import/preview', ({ body }) => previewImport(String(body.csv ?? ''), String(body.mode ?? 'CREATE_ONLY')), 'editor');
route('POST', '/api/vacations/import/apply', (ctx) => {
	const preview = previewImport(String(ctx.body.csv ?? ''), String(ctx.body.mode ?? 'CREATE_ONLY'));
	const errors: Record<string, string> = Object.fromEntries(preview.invalidRows.map((r) => [r.rowNumber, r.error]));
	const successfulIds: string[] = [];
	for (const row of preview.validRows) {
		try {
			const existing = state.vacations.find((v) => v.vacationNumber === row.vacationNumber);
			const request = row.request as Json;
			successfulIds.push(existing ? updateVacation(ctx, existing.id, request).id : createVacation(ctx, request, String(row.vacationNumber)).id);
		} catch (error) {
			errors[String(row.rowNumber)] = (error as Error).message;
		}
	}
	return { successfulIds, errors };
}, 'editor');
route('GET', '/api/vacations/{id}', (_, [id]) => vacationDto(findVacation(id)));

function createVacation(ctx: Ctx, body: Json, number?: string) {
	requireBody(body, ['employeeId', 'vacationTypeId', 'title', 'startDate', 'endDate']);
	if (!state.users.some((u) => u.id === body.employeeId)) notFound('Employee');
	const type = state.types.find((t) => t.id === body.vacationTypeId) ?? notFound('Vacation type');
	if (!type.active) conflict('Vacation type is inactive');
	const v = {
		id: uuid(),
		vacationNumber: number ?? `VAC-${uuid()}`,
		employeeId: String(body.employeeId),
		vacationTypeId: String(body.vacationTypeId),
		title: String(body.title),
		description: (body.description as string) ?? null,
		startDate: String(body.startDate),
		endDate: String(body.endDate),
		daysCount: 0,
		status: (body.status as Status) ?? 'DRAFT',
		urgent: Boolean(body.urgent),
		tags: (body.tags as string[]) ?? [],
		priority: 'NORMAL',
		version: 0,
		archived: false,
		createdAt: now()
	};
	validateVacation(v);
	state.vacations.push(v);
	audit(ctx.userId, 'CREATE', 'VACATION', v.id);
	return vacationDto(v);
}

function updateVacation(ctx: Ctx, id: string, body: Json) {
	const v = findVacation(id);
	requireBody(body, ['employeeId', 'vacationTypeId', 'title', 'startDate', 'endDate']);
	if (body.version === null || body.version === undefined || body.version !== v.version) conflict('Vacation version is stale');
	checkTransition(v, body.status as Status);
	const next = { ...v, ...body, description: (body.description as string) ?? null, urgent: Boolean(body.urgent), tags: (body.tags as string[]) ?? [] } as typeof v;
	if (next.vacationTypeId !== v.vacationTypeId && !state.types.find((t) => t.id === next.vacationTypeId)?.active) conflict('Vacation type is inactive');
	validateVacation(next);
	const previous = v.status;
	Object.assign(v, next, { version: v.version + 1 });
	audit(ctx.userId, 'UPDATE', 'VACATION', id);
	if (previous !== v.status) audit(ctx.userId, 'CHANGE_STATUS', 'VACATION', id, `${previous} -> ${v.status}`);
	return vacationDto(v);
}

route('POST', '/api/vacations', (ctx) => createVacation(ctx, ctx.body), 'editor');
route('PUT', '/api/vacations/{id}', (ctx, [id]) => updateVacation(ctx, id, ctx.body), 'editor');
route('DELETE', '/api/vacations/{id}', (ctx, [id]) => {
	const v = findVacation(id);
	v.archived = true;
	v.version++;
	audit(ctx.userId, 'ARCHIVE', 'VACATION', id);
}, 'editor');
route('POST', '/api/vacations/{id}/restore', (ctx, [id]) => {
	const v = findVacation(id);
	const restored = { ...v, archived: false };
	validateVacation(restored);
	Object.assign(v, restored, { version: v.version + 1 });
	audit(ctx.userId, 'RESTORE', 'VACATION', id);
}, 'editor');
route('DELETE', '/api/vacations/{id}/permanent', (ctx, [id]) => {
	findVacation(id);
	state.vacations = state.vacations.filter((v) => v.id !== id);
	state.notes = state.notes.filter((n) => n.vacationId !== id);
	audit(ctx.userId, 'PERMANENT_DELETE', 'VACATION', id);
}, 'admin');
route('POST', '/api/vacations/bulk', (ctx) => {
	const ids = (ctx.body.ids as string[]) ?? [];
	if (!ids.length) fail(400, 'VALIDATION_ERROR', 'Request validation failed', { ids: 'must not be empty' });
	if (ids.length > 500) fail(400, 'VALIDATION_ERROR', 'At most 500 vacations can be processed at once');
	const successfulIds: string[] = [];
	const errors: Record<string, string> = {};
	for (const id of ids) {
		try {
			const v = findVacation(id);
			const next = { ...v, tags: [...v.tags] };
			const tag = String(ctx.body.tag ?? '').trim();
			switch (ctx.body.operation) {
				case 'ARCHIVE': next.archived = true; break;
				case 'RESTORE': next.archived = false; break;
				case 'CHANGE_STATUS':
					if (!ctx.body.status) fail(400, 'VALIDATION_ERROR', 'status is required');
					checkTransition(v, ctx.body.status as Status);
					next.status = ctx.body.status as Status;
					break;
				case 'ADD_TAG':
					if (!tag) fail(400, 'VALIDATION_ERROR', 'A nonblank tag of at most 100 characters is required');
					if (!next.tags.includes(tag)) next.tags.push(tag);
					break;
				case 'REMOVE_TAG': next.tags = next.tags.filter((t) => t !== tag); break;
			}
			validateVacation(next);
			Object.assign(v, next, { version: v.version + 1 });
			successfulIds.push(id);
		} catch (error) {
			errors[id] = (error as Error).message;
		}
	}
	return { successfulIds, errors };
}, 'editor');

// notes
const noteDto = (n: State['notes'][number]) => ({ id: n.id, author: userDto(state.users.find((u) => u.id === n.authorId)!), text: n.text, pinned: n.pinned, createdAt: n.createdAt });
route('GET', '/api/vacations/{id}/notes', (_, [id]) => {
	findVacation(id);
	return state.notes.filter((n) => n.vacationId === id).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)).map(noteDto);
});
route('POST', '/api/vacations/{id}/notes', (ctx, [id]) => {
	findVacation(id);
	requireBody(ctx.body, ['text']);
	const note = { id: uuid(), vacationId: id, authorId: ctx.userId!, text: String(ctx.body.text), pinned: Boolean(ctx.body.pinned), createdAt: now() };
	state.notes.push(note);
	return noteDto(note);
}, 'editor');
route('PUT', '/api/vacations/{id}/notes/{id}', (ctx, [id, noteId]) => {
	const note = state.notes.find((n) => n.id === noteId && n.vacationId === id) ?? notFound('Note');
	Object.assign(note, { text: String(ctx.body.text), pinned: Boolean(ctx.body.pinned) });
	return noteDto(note);
}, 'editor');
route('DELETE', '/api/vacations/{id}/notes/{id}', (_, [id, noteId]) => {
	state.notes.find((n) => n.id === noteId && n.vacationId === id) ?? notFound('Note');
	state.notes = state.notes.filter((n) => n.id !== noteId);
}, 'editor');

// dictionaries
route('GET', '/api/vacation-types', () => state.types);
route('POST', '/api/vacation-types', ({ body }) => {
	if (state.types.some((t) => t.code === body.code || t.name === body.name)) conflict('Database constraint conflict');
	const type = { id: uuid(), code: String(body.code), name: String(body.name), description: (body.description as string) ?? null, active: Boolean(body.active) };
	state.types.push(type);
	return type;
}, 'admin');
route('PUT', '/api/vacation-types/{id}', ({ body }, [id]) => {
	const type = state.types.find((t) => t.id === id) ?? notFound('Vacation type');
	Object.assign(type, { code: body.code, name: body.name, description: body.description ?? null, active: Boolean(body.active) });
	return type;
}, 'admin');
const departmentDto = (d: State['departments'][number], includeInactive: boolean) => ({
	id: d.id,
	name: d.name,
	active: d.active,
	shifts: d.shifts.filter((s) => includeInactive || s.active)
});
route('GET', '/api/departments', () => state.departments.filter((d) => d.active).map((d) => departmentDto(d, false)));
route('GET', '/api/admin/departments', () => state.departments.map((d) => departmentDto(d, true)), 'admin');
route('POST', '/api/admin/departments', ({ body }) => {
	const d = { id: uuid(), name: String(body.name), active: body.active !== false, shifts: [] };
	state.departments.push(d);
	return departmentDto(d, true);
}, 'admin');
route('PUT', '/api/admin/departments/{id}', ({ body }, [id]) => {
	const d = state.departments.find((x) => x.id === id) ?? notFound('Department');
	Object.assign(d, { name: body.name, active: Boolean(body.active) });
	return departmentDto(d, true);
}, 'admin');
route('POST', '/api/admin/departments/{id}/shifts', ({ body }, [id]) => {
	const d = state.departments.find((x) => x.id === id) ?? notFound('Department');
	const shift = { id: uuid(), name: String(body.name), active: body.active !== false };
	d.shifts.push(shift);
	return shift;
}, 'admin');
route('PUT', '/api/admin/departments/{id}/shifts/{id}', ({ body }, [id, shiftId]) => {
	const shift = state.departments.find((x) => x.id === id)?.shifts.find((s) => s.id === shiftId) ?? notFound('Shift');
	Object.assign(shift, { name: body.name, active: Boolean(body.active) });
	return shift;
}, 'admin');

// shift plans & availability
route('PUT', '/api/admin/shift-plans', (ctx) => {
	const planDays = (ctx.body.days as { date: string; shifts: { shiftId: string; minimumStaff: number; employeeIds: string[] }[] }[]) ?? [];
	if (planDays.some((d) => d.date < today())) fail(400, 'VALIDATION_ERROR', 'Shift plans can only be set for today or a future date');
	for (const d of planDays) {
		const seen = new Set<string>();
		for (const s of d.shifts) for (const e of s.employeeIds) {
			if (seen.has(e)) fail(400, 'VALIDATION_ERROR', 'An employee can be assigned to only one shift per date');
			seen.add(e);
		}
	}
	const dates = new Set(planDays.map((d) => d.date));
	state.plans = state.plans.filter((p) => !dates.has(p.date));
	for (const d of planDays) for (const s of d.shifts) state.plans.push({ date: d.date, ...s });
	audit(ctx.userId, 'REPLACE', 'SHIFT_PLAN', null, `Replaced shift plans for ${dates.size} date(s)`);
}, 'admin');
route('GET', '/api/analytics/availability', ({ query }) => {
	const from = query.get('from') ?? '';
	const to = query.get('to') ?? '';
	if (!from || !to || from > to || from < today() || days(from, to) > 366) {
		fail(400, 'VALIDATION_ERROR', 'Availability range must be within today and the following 365 days');
	}
	const departmentId = query.get('departmentId');
	const dates: string[] = [];
	for (let d = new Date(from); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) dates.push(d.toISOString().slice(0, 10));
	const away = (employeeId: string, date: string, status: Status) =>
		state.vacations.some((v) => v.employeeId === employeeId && v.status === status && v.startDate <= date && v.endDate >= date);
	return {
		from,
		to,
		departments: state.departments
			.filter((d) => d.active && (!departmentId || d.id === departmentId))
			.map((d) => ({
				id: d.id,
				name: d.name,
				shifts: d.shifts.filter((s) => s.active).map((s) => ({
					id: s.id,
					name: s.name,
					days: dates.map((date) => {
						const plan = state.plans.find((p) => p.shiftId === s.id && p.date === date);
						if (!plan) return { date, planned: false, minimumStaff: null, scheduledStaff: null, approvedAbsent: null, pendingAbsent: null, availableAfterApproved: null, forecastAvailable: null, confirmedShortage: null, forecastShortage: null };
						const approved = plan.employeeIds.filter((e) => away(e, date, 'APPROVED')).length;
						const pending = plan.employeeIds.filter((e) => !away(e, date, 'APPROVED') && away(e, date, 'PENDING')).length;
						const availableAfterApproved = plan.employeeIds.length - approved;
						const forecastAvailable = availableAfterApproved - pending;
						return { date, planned: true, minimumStaff: plan.minimumStaff, scheduledStaff: plan.employeeIds.length, approvedAbsent: approved, pendingAbsent: pending, availableAfterApproved, forecastAvailable, confirmedShortage: availableAfterApproved < plan.minimumStaff, forecastShortage: forecastAvailable < plan.minimumStaff };
					})
				}))
			}))
	};
});
route('GET', '/api/analytics/summary', () => {
	const count = (key: (v: State['vacations'][number]) => string) =>
		state.vacations.reduce<Record<string, number>>((acc, v) => ((acc[key(v)] = (acc[key(v)] ?? 0) + 1), acc), {});
	const total = state.vacations.length;
	return {
		totalCount: total,
		activeCount: state.vacations.filter((v) => !v.archived).length,
		archivedCount: state.vacations.filter((v) => v.archived).length,
		urgentCount: state.vacations.filter((v) => v.urgent).length,
		averageDaysCount: total ? state.vacations.reduce((s, v) => s + v.daysCount, 0) / total : 0,
		byVacationType: count((v) => state.types.find((t) => t.id === v.vacationTypeId)!.name),
		byStatus: count((v) => v.status),
		byPriority: count((v) => v.priority)
	};
});

// admin: users & audit
route('GET', '/api/admin/users', ({ query }) => {
	const result = page(state.users, Number(query.get('page') ?? 0), Number(query.get('size') ?? 20));
	return { ...result, content: result.content.map(userDto) };
}, 'admin');
route('POST', '/api/admin/users', (ctx) => {
	requireBody(ctx.body, ['login', 'fullName']);
	if (state.users.some((u) => u.login === ctx.body.login)) conflict('Login already exists');
	if (!ctx.body.temporaryPassword) conflict('A temporary password is required when creating a user');
	const user = { id: uuid(), login: String(ctx.body.login), fullName: String(ctx.body.fullName), roles: ctx.body.roles as Role[], active: Boolean(ctx.body.active), mustChangePassword: true, password: String(ctx.body.temporaryPassword), failed: 0, lockedUntil: 0 };
	state.users.push(user);
	audit(ctx.userId, 'CREATE', 'USER', user.id);
	return userDto(user);
}, 'admin');
route('PUT', '/api/admin/users/{id}', (ctx, [id]) => {
	const user = state.users.find((u) => u.id === id) ?? notFound('User');
	if (state.users.some((u) => u.login === ctx.body.login && u.id !== id)) conflict('Login already exists');
	Object.assign(user, { login: ctx.body.login, fullName: ctx.body.fullName, roles: ctx.body.roles, active: Boolean(ctx.body.active) });
	audit(ctx.userId, 'UPDATE', 'USER', id);
	return userDto(user);
}, 'admin');
route('POST', '/api/admin/users/{id}/reset-password', (ctx, [id]) => {
	const user = state.users.find((u) => u.id === id) ?? notFound('User');
	Object.assign(user, { password: String(ctx.body.temporaryPassword), mustChangePassword: true, failed: 0, lockedUntil: 0 });
	audit(ctx.userId, 'RESET_PASSWORD', 'USER', id);
}, 'admin');
route('GET', '/api/admin/audit', ({ query }) => {
	const search = query.get('search')?.toLowerCase();
	const list = search
		? state.audit.filter((a) => [a.description, a.eventType, a.entityType, a.correlationId].some((s) => s.toLowerCase().includes(search)))
		: state.audit;
	return page(list, Number(query.get('page') ?? 0), Number(query.get('size') ?? 20));
}, 'admin');

// ------------------------------------------------------------------ server

function respond(status: number, body?: unknown, correlationId?: string) {
	if (body instanceof Response) return body;
	return new Response(body === undefined ? null : JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', 'x-correlation-id': correlationId ?? '' }
	});
}

Bun.serve({
	port: PORT,
	async fetch(request) {
		const url = new URL(request.url);
		const correlationId = request.headers.get('x-correlation-id') ?? uuid();
		if (url.pathname === '/__reset' && request.method === 'POST') {
			state = fixtures();
			return respond(204);
		}
		if (url.pathname === '/actuator/health') return respond(200, { status: 'UP' });
		try {
			const match = routes.find(([method, pattern]) => method === request.method && pattern.test(url.pathname));
			if (!match) fail(404, 'NOT_FOUND', 'Resource not found');
			const [, pattern, handler, access] = match!;
			const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
			const userId = state.access.get(token) ?? null;
			const user = state.users.find((u) => u.id === userId);
			if (access !== 'any' && (!user || !user.active)) fail(401, 'UNAUTHORIZED', 'Authentication is required');
			if (!url.pathname.startsWith('/api/auth/') && access !== 'any' && user?.mustChangePassword) fail(403, 'FORBIDDEN', 'Access is denied');
			if (access === 'any' && !url.pathname.startsWith('/api/auth/') && (!user || user.mustChangePassword)) {
				fail(user ? 403 : 401, user ? 'FORBIDDEN' : 'UNAUTHORIZED', user ? 'Access is denied' : 'Authentication is required');
			}
			if (access === 'editor' && !user!.roles.some((r) => r === 'EDITOR' || r === 'ADMIN')) fail(403, 'FORBIDDEN', 'Access is denied');
			if (access === 'admin' && !user!.roles.includes('ADMIN')) fail(403, 'FORBIDDEN', 'Access is denied');
			const text = request.method === 'GET' ? '' : await request.text();
			let body: Json = {};
			if (text) {
				try {
					body = JSON.parse(text);
				} catch {
					badRequest();
				}
			}
			const params = pattern.exec(url.pathname)!.slice(1);
			const result = handler({ method: request.method, path: url.pathname, query: url.searchParams, body, userId }, params);
			return respond(200, result, correlationId);
		} catch (error) {
			if (error instanceof HttpError) {
				return respond(error.status, { timestamp: now(), status: error.status, error: error.code, message: error.message, path: url.pathname, correlationId, fieldErrors: error.fieldErrors }, correlationId);
			}
			console.error(error);
			return respond(500, { timestamp: now(), status: 500, error: 'INTERNAL_ERROR', message: 'Unexpected server error', path: url.pathname, correlationId, fieldErrors: {} }, correlationId);
		}
	}
});

console.log(`Vacatime mock API on http://localhost:${PORT}`);
