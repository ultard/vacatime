import type { RequestHandler } from './$types';
import { apiResponse } from '#lib/server/api/client.ts';

const ALLOWED = new Set([
	'search',
	'employeeId',
	'vacationTypeId',
	'status',
	'urgent',
	'priority',
	'tag',
	'archived',
	'startDateFrom',
	'startDateTo',
	'daysCount',
	'daysCountOperator'
]);

/** Streams the backend CSV export through the BFF (the browser never sees the token). */
export const GET: RequestHandler = async ({ url }) => {
	const query = Object.fromEntries([...url.searchParams].filter(([key]) => ALLOWED.has(key)));
	const response = await apiResponse('GET', '/api/vacations/export', { query });
	const date = new Date().toISOString().slice(0, 10);
	return new Response(response.body, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="vacations-${date}.csv"`,
			'Cache-Control': 'no-store'
		}
	});
};
