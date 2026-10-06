import { command, form, getRequestEvent, query, requested } from '$app/server';
import { error, invalid } from '@sveltejs/kit';
import { z } from 'zod';
import type {
	BulkResult,
	NoteDto,
	PageResponse,
	VacationDto,
	VacationRequest
} from '#lib/api/types.ts';
import {
	bulkSchema,
	noteSchema,
	parseTags,
	statusChangeSchema,
	uuid,
	vacationFormSchema,
	vacationListSchema
} from '#lib/schemas/vacation.ts';
import { api } from '#lib/server/api/client.ts';
import { fetchAllVacations } from '#lib/server/vacations.ts';
import { ApiFailure, isApiFailure } from '#lib/server/api/errors.ts';
import { m } from '#lib/paraglide/messages.js';

function requireEditor() {
	const user = getRequestEvent().locals.user;
	if (!user?.canEdit) error(403, m.err_forbidden());
}

export const listVacations = query(vacationListSchema, (params) =>
	api.get<PageResponse<VacationDto>>('/api/vacations', { query: params })
);

export const listAllVacations = query(
	vacationListSchema.omit({ page: true, size: true, sort: true, direction: true }),
	(filter) => fetchAllVacations(filter)
);

export const searchVacations = query(z.string().trim().min(1).max(200), async (search) => {
	const result = await api.get<PageResponse<VacationDto>>('/api/vacations', {
		query: { search, size: 8, sort: 'startDate', direction: 'DESC' }
	});
	return result.content;
});

export const getVacation = query(uuid, (id) => api.get<VacationDto>(`/api/vacations/${id}`));

const FIELD_ERROR_PATHS = new Set([
	'employeeId',
	'vacationTypeId',
	'title',
	'description',
	'startDate',
	'endDate',
	'tags',
	'status'
]);

export const saveVacation = form(vacationFormSchema, async (data, issue) => {
	requireEditor();
	const body: VacationRequest = {
		employeeId: data.employeeId,
		vacationTypeId: data.vacationTypeId,
		title: data.title,
		description: data.description?.trim() ? data.description : null,
		startDate: data.startDate,
		endDate: data.endDate,
		urgent: data.urgent ?? false,
		tags: parseTags(data.tags),
		status: data.status,
		version: data.version ?? null
	};
	try {
		const saved = data.id
			? await api.put<VacationDto>(`/api/vacations/${data.id}`, body)
			: await api.post<VacationDto>('/api/vacations', body);
		if (data.id) getVacation(data.id).set(saved);
		return { saved };
	} catch (failure) {
		if (!isApiFailure(failure)) throw failure;
		if (data.id && failure.backendMessage === 'Vacation version is stale') {
			const latest = await api.get<VacationDto>(`/api/vacations/${data.id}`);
			return { conflict: latest };
		}
		return mapFailure(failure, issue);
	}
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFailure(failure: ApiFailure, issue: any): never {
	const fieldIssues = Object.entries(failure.fieldErrors)
		.filter(([field]) => FIELD_ERROR_PATHS.has(field))
		.map(([field, message]) => issue[field](message));
	if (fieldIssues.length) invalid(...fieldIssues);
	switch (failure.backendMessage) {
		case 'Employee has an overlapping active vacation':
			invalid(issue.startDate(failure.message));
			break;
		case 'startDate must not be after endDate':
			invalid(issue.endDate(failure.message));
			break;
		case 'Employee not found':
			invalid(issue.employeeId(failure.message));
			break;
		case 'Vacation type is inactive':
		case 'Vacation type not found':
			invalid(issue.vacationTypeId(failure.message));
			break;
		case 'Vacation cannot be approved':
			invalid(issue.status(failure.message));
			break;
	}
	if (failure.status < 500) invalid(failure.message);
	throw failure;
}

async function refreshLists(id?: string) {
	if (id) void getVacation(id).refresh();
	await requested(getVacation, 5).refreshAll();
	await requested(listVacations, 10).refreshAll();
	await requested(listAllVacations, 5).refreshAll();
}

/** Change only the status, keeping every other field (optimistic locking via version). */
export const changeStatus = command(statusChangeSchema, async ({ id, status, version }) => {
	requireEditor();
	const current = await api.get<VacationDto>(`/api/vacations/${id}`);
	if (version !== null && current.version !== version) {
		error(409, m.err_version_stale(), { code: 'VERSION_CONFLICT' });
	}
	const body: VacationRequest = {
		employeeId: current.employee.id,
		vacationTypeId: current.vacationType.id,
		title: current.title,
		description: current.description,
		startDate: current.startDate,
		endDate: current.endDate,
		urgent: current.urgent,
		tags: current.tags,
		status,
		version: current.version
	};
	const saved = await api.put<VacationDto>(`/api/vacations/${id}`, body);
	await refreshLists(id);
	return saved;
});

export const archiveVacation = command(uuid, async (id) => {
	requireEditor();
	await api.delete(`/api/vacations/${id}`);
	await refreshLists(id);
});

export const restoreVacation = command(uuid, async (id) => {
	requireEditor();
	await api.post(`/api/vacations/${id}/restore`);
	await refreshLists(id);
});

export const deleteVacation = command(uuid, async (id) => {
	if (!getRequestEvent().locals.user?.isAdmin) error(403, m.err_forbidden());
	await api.delete(`/api/vacations/${id}/permanent`);
	await refreshLists();
});

export const bulkVacations = command(bulkSchema, async (request) => {
	requireEditor();
	const result = await api.post<BulkResult>('/api/vacations/bulk', request);
	await refreshLists();
	return result;
});

export const listNotes = query(uuid, (vacationId) =>
	api.get<NoteDto[]>(`/api/vacations/${vacationId}/notes`)
);

export const saveNote = command(noteSchema, async ({ vacationId, noteId, text, pinned }) => {
	requireEditor();
	const note = noteId
		? await api.put<NoteDto>(`/api/vacations/${vacationId}/notes/${noteId}`, { text, pinned })
		: await api.post<NoteDto>(`/api/vacations/${vacationId}/notes`, { text, pinned });
	await requested(listNotes, 2).refreshAll();
	return note;
});

export const deleteNote = command(z.object({ vacationId: uuid, noteId: uuid }), async ({ vacationId, noteId }) => {
	requireEditor();
	await api.delete(`/api/vacations/${vacationId}/notes/${noteId}`);
	await requested(listNotes, 2).refreshAll();
});
