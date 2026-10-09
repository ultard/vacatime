import { getRequestEvent, query } from '$app/server';
import type { DepartmentDto, PageResponse, UserDto, VacationTypeDto } from '#lib/api/types.ts';
import { api } from '#lib/server/api/client.ts';
import { fetchAllVacations } from '#lib/server/vacations.ts';

export const listVacationTypes = query(() => api.get<VacationTypeDto[]>('/api/vacation-types'));

export const listDepartments = query(() => api.get<DepartmentDto[]>('/api/departments'));

export interface EmployeeOption {
	id: string;
	fullName: string;
	login: string;
	active: boolean;
}

/**
 * Employees available to pick in forms.
 * ADMIN sees every user (`/api/admin/users`). The API has no employee directory for EDITOR,
 * so editors get everyone who already has a vacation plus themselves (`complete: false`).
 */
export const listEmployees = query(async (): Promise<{ employees: EmployeeOption[]; complete: boolean }> => {
	const user = getRequestEvent().locals.user;
	const byId = new Map<string, EmployeeOption>();
	const add = (u: UserDto) => byId.set(u.id, { id: u.id, fullName: u.fullName, login: u.login, active: u.active });

	if (user?.isAdmin) {
		for (let page = 0; ; page++) {
			const result = await api.get<PageResponse<UserDto>>('/api/admin/users', { query: { page, size: 100 } });
			result.content.forEach(add);
			if (page + 1 >= result.totalPages) break;
		}
	} else {
		for (const vacation of await fetchAllVacations({})) add(vacation.employee);
		if (user) add(user);
	}
	const employees = [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
	return { employees, complete: !!user?.isAdmin };
});
