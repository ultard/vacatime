import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';

export const loginSchema = z.object({
	login: z.string().trim().min(1, { error: () => m.v_required() }),
	password: z.string().min(1, { error: () => m.v_required() }),
	next: z.string().optional()
});

export const changePasswordSchema = z
	.object({
		oldPassword: z.string().min(1, { error: () => m.v_required() }).max(72),
		newPassword: z
			.string()
			.min(8, { error: () => m.v_password_min() })
			.max(72, { error: () => m.v_max({ max: 72 }) }),
		confirmPassword: z.string().min(1, { error: () => m.v_required() })
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		path: ['confirmPassword'],
		error: () => m.v_passwords_mismatch()
	});

/** 0..4 score used by the strength meter. */
export function passwordStrength(password: string): number {
	if (!password) return 0;
	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[a-zа-яё]/.test(password) && /[A-ZА-ЯЁ]/.test(password)) score++;
	if (/\d/.test(password) && /[^\p{L}\d]/u.test(password)) score++;
	return score;
}
