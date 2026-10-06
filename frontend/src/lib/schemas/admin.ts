import { z } from 'zod';
import { ROLES } from '#lib/api/types.ts';
import { m } from '#lib/paraglide/messages.js';
import { uuid } from './vacation.ts';

const required = { error: () => m.v_required() };
const max = (n: number) => ({ error: () => m.v_max({ max: n }) });

export const userFormSchema = z.object({
	id: z.string().optional(),
	login: z.string().trim().min(1, required).max(100, max(100)),
	fullName: z.string().trim().min(1, required).max(255, max(255)),
	roles: z.array(z.enum(ROLES)).min(1, { error: () => m.adm_roles_required() }),
	active: z.boolean().optional(),
	temporaryPassword: z
		.string()
		.optional()
		.refine((v) => !v || (v.length >= 8 && v.length <= 72), { error: () => m.v_password_min() })
});

export const resetPasswordSchema = z.object({
	id: uuid,
	temporaryPassword: z.string().min(8).max(72)
});

export const vacationTypeFormSchema = z.object({
	id: z.string().optional(),
	code: z.string().trim().min(1, required).max(50, max(50)),
	name: z.string().trim().min(1, required).max(100, max(100)),
	description: z.string().max(1000, max(1000)).optional(),
	active: z.boolean().optional()
});

export const departmentSchema = z.object({
	id: uuid.optional(),
	name: z.string().trim().min(1, required).max(100, max(100)),
	active: z.boolean()
});

export const shiftSchema = z.object({
	departmentId: uuid,
	id: uuid.optional(),
	name: z.string().trim().min(1, required).max(100, max(100)),
	active: z.boolean()
});

export const shiftPlanSchema = z.object({
	days: z
		.array(
			z.object({
				date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				shifts: z.array(
					z.object({ shiftId: uuid, minimumStaff: z.number().int().min(0), employeeIds: z.array(uuid) })
				)
			})
		)
		.min(1)
		.max(366)
});

export const auditQuerySchema = z.object({
	search: z.string().max(200).optional(),
	page: z.number().int().min(0).default(0),
	size: z.number().int().min(1).max(100).default(25),
	sort: z.enum(['createdAt', 'eventType', 'entityType']).default('createdAt'),
	direction: z.enum(['ASC', 'DESC']).default('DESC')
});

/** Strong random temporary password (no ambiguous characters). */
export function generatePassword(length = 14): string {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*-_';
	const values = crypto.getRandomValues(new Uint32Array(length));
	return Array.from(values, (v) => alphabet[v % alphabet.length]).join('');
}
