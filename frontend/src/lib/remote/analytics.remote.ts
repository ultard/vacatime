import { query } from '$app/server';
import { z } from 'zod';
import type { AnalyticsDto, AvailabilityDto } from '#lib/api/types.ts';
import { uuid } from '#lib/schemas/vacation.ts';
import { api } from '#lib/server/api/client.ts';

export const getSummary = query(() => api.get<AnalyticsDto>('/api/analytics/summary'));

const availabilitySchema = z.object({
	from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	departmentId: uuid.optional()
});

export const getAvailability = query(availabilitySchema, (params) =>
	api.get<AvailabilityDto>('/api/analytics/availability', { query: params })
);
