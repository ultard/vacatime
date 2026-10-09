import { command, form, getRequestEvent, query, requested } from '$app/server';
import { error, invalid } from '@sveltejs/kit';
import { z } from 'zod';
import type {
	AuditLogDto,
	DepartmentDto,
	PageResponse,
	ShiftDto,
	UserDto,
	VacationTypeDto
} from '#lib/api/types.ts';
import {
	auditQuerySchema,
	departmentSchema,
	resetPasswordSchema,
	shiftPlanSchema,
	shiftSchema,
	userFormSchema,
	vacationTypeFormSchema
} from '#lib/schemas/admin.ts';
import { api } from '#lib/server/api/client.ts';
import { isApiFailure } from '#lib/server/api/errors.ts';
import { m } from '#lib/paraglide/messages.js';
import { listDepartments, listEmployees, listVacationTypes } from './dictionaries.remote.ts';

function requireAdmin() {
	if (!getRequestEvent().locals.user?.isAdmin) error(403, m.err_forbidden());
}

// ---------------------------------------------------------------- users

export const listUsers = query(
	z.object({ page: z.number().int().min(0), size: z.number().int().min(1).max(100) }),
	(params) => {
		requireAdmin();
		return api.get<PageResponse<UserDto>>('/api/admin/users', { query: params });
	}
);

export const saveUser = form(userFormSchema, async (data, issue) => {
	requireAdmin();
	const body = {
		login: data.login,
		fullName: data.fullName,
		roles: data.roles,
		active: data.active ?? false,
		temporaryPassword: data.id ? null : data.temporaryPassword || null
	};
	if (!data.id && !body.temporaryPassword) invalid(issue.temporaryPassword(m.err_temp_password_required()));
	try {
		const user = data.id
			? await api.put<UserDto>(`/api/admin/users/${data.id}`, body)
			: await api.post<UserDto>('/api/admin/users', body);
		void listEmployees().refresh();
		await requested(listUsers, 5).refreshAll();
		return { user };
	} catch (failure) {
		if (isApiFailure(failure)) {
			if (failure.backendMessage === 'Login already exists') invalid(issue.login(failure.message));
			if (failure.status < 500) invalid(failure.message);
		}
		throw failure;
	}
});

export const resetPassword = command(resetPasswordSchema, async ({ id, temporaryPassword }) => {
	requireAdmin();
	await api.post(`/api/admin/users/${id}/reset-password`, { temporaryPassword });
	await requested(listUsers, 5).refreshAll();
});

// ---------------------------------------------------------------- vacation types

export const saveVacationType = form(vacationTypeFormSchema, async (data, issue) => {
	requireAdmin();
	const body = {
		code: data.code,
		name: data.name,
		description: data.description?.trim() ? data.description : null,
		active: data.active ?? false
	};
	try {
		const type = data.id
			? await api.put<VacationTypeDto>(`/api/vacation-types/${data.id}`, body)
			: await api.post<VacationTypeDto>('/api/vacation-types', body);
		void listVacationTypes().refresh();
		await requested(listVacationTypes, 1).refreshAll();
		return { type };
	} catch (failure) {
		if (isApiFailure(failure) && failure.status === 409) invalid(issue.code(m.adm_type_duplicate()));
		if (isApiFailure(failure) && failure.status < 500) invalid(failure.message);
		throw failure;
	}
});

// ---------------------------------------------------------------- departments & shifts

export const listAdminDepartments = query(() => {
	requireAdmin();
	return api.get<DepartmentDto[]>('/api/admin/departments');
});

async function afterDepartmentChange() {
	void listAdminDepartments().refresh();
	void listDepartments().refresh();
	await requested(listAdminDepartments, 1).refreshAll();
}

export const saveDepartment = command(departmentSchema, async ({ id, name, active }) => {
	requireAdmin();
	const department = id
		? await api.put<DepartmentDto>(`/api/admin/departments/${id}`, { name, active })
		: await api.post<DepartmentDto>('/api/admin/departments', { name, active });
	await afterDepartmentChange();
	return department;
});

export const saveShift = command(shiftSchema, async ({ departmentId, id, name, active }) => {
	requireAdmin();
	const shift = id
		? await api.put<ShiftDto>(`/api/admin/departments/${departmentId}/shifts/${id}`, { name, active })
		: await api.post<ShiftDto>(`/api/admin/departments/${departmentId}/shifts`, { name, active });
	await afterDepartmentChange();
	return shift;
});

// ---------------------------------------------------------------- shift plan

export const replaceShiftPlan = command(shiftPlanSchema, async (plan) => {
	requireAdmin();
	await api.put('/api/admin/shift-plans', plan);
});

// ---------------------------------------------------------------- audit

export const listAudit = query(auditQuerySchema, (params) => {
	requireAdmin();
	return api.get<PageResponse<AuditLogDto>>('/api/admin/audit', {
		query: { ...params, search: params.search?.trim() || undefined }
	});
});
