import type { PageResponse, VacationDto } from '#lib/api/types.ts';
import { api } from './api/client.ts';

/** Fetch every vacation matching the filter, page by page (timeline / board / dictionaries). */
export async function fetchAllVacations(filter: Record<string, unknown>, limit = 2000): Promise<VacationDto[]> {
	const all: VacationDto[] = [];
	for (let page = 0; all.length < limit; page++) {
		const result = await api.get<PageResponse<VacationDto>>('/api/vacations', {
			query: { ...(filter as Record<string, string>), page, size: 100, sort: 'startDate', direction: 'ASC' }
		});
		all.push(...result.content);
		if (page + 1 >= result.totalPages) break;
	}
	return all;
}
