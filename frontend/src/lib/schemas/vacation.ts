import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';
import {
	BULK_OPERATIONS,
	COMPARISON_OPERATORS,
	PRIORITIES,
	VACATION_SORTS,
	VACATION_STATUSES
} from '#lib/api/types.ts';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
	error: () => m.v_uuid()
});

export const vacationFilterSchema = z.object({
	search: z.string().max(200).optional(),
	employeeId: uuid.optional(),
	vacationTypeId: uuid.optional(),
	status: z.enum(VACATION_STATUSES).optional(),
	urgent: z.boolean().optional(),
	priority: z.enum(PRIORITIES).optional(),
	tag: z.string().max(100).optional(),
	archived: z.boolean().optional(),
	startDateFrom: isoDate.optional(),
	startDateTo: isoDate.optional(),
	daysCount: z.number().int().min(1).max(10000).optional(),
	daysCountOperator: z.enum(COMPARISON_OPERATORS).optional()
});

export const vacationListSchema = vacationFilterSchema.extend({
	page: z.number().int().min(0).default(0),
	size: z.number().int().min(1).max(100).default(20),
	sort: z.enum(VACATION_SORTS).default('createdAt'),
	direction: z.enum(['ASC', 'DESC']).default('DESC')
});
export type VacationListParams = z.input<typeof vacationListSchema>;

const required = { error: () => m.v_required() };

/** Remote form schema for create/edit. Booleans must be optional for checkbox inputs. */
export const vacationFormSchema = z
	.object({
		id: z.string().optional(),
		version: z.number().int().optional(),
		employeeId: z.string().min(1, required).pipe(uuid),
		vacationTypeId: z.string().min(1, required),
		title: z.string().trim().min(1, required).max(255, { error: () => m.v_max({ max: 255 }) }),
		description: z
			.string()
			.max(4000, { error: () => m.v_max({ max: 4000 }) })
			.optional(),
		startDate: isoDate.or(z.literal('')).refine((v) => v !== '', { error: () => m.v_date() }),
		endDate: isoDate.or(z.literal('')).refine((v) => v !== '', { error: () => m.v_date() }),
		urgent: z.boolean().optional(),
		status: z.enum(VACATION_STATUSES),
		/** JSON array of tags (kept in a hidden input by the tag editor). */
		tags: z.string().optional()
	})
	.refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
		path: ['endDate'],
		error: () => m.err_dates_order()
	});

export function parseTags(raw: string | undefined): string[] {
	if (!raw) return [];
	try {
		const value = JSON.parse(raw);
		return Array.isArray(value) ? value.map(String) : [];
	} catch {
		return [];
	}
}

export const statusChangeSchema = z.object({
	id: uuid,
	status: z.enum(VACATION_STATUSES),
	version: z.number().int().nullable()
});

export const bulkSchema = z.object({
	ids: z.array(uuid).min(1).max(500),
	operation: z.enum(BULK_OPERATIONS),
	status: z.enum(VACATION_STATUSES).optional(),
	tag: z.string().trim().min(1).max(100).optional()
});

export const noteSchema = z.object({
	vacationId: uuid,
	noteId: uuid.optional(),
	text: z.string().trim().min(1).max(4000),
	pinned: z.boolean()
});
