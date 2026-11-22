import { form, getRequestEvent, query } from '$app/server';
import { invalid, redirect } from '@sveltejs/kit';
import type { TokenResponse } from '#lib/api/types.ts';
import { changePasswordSchema, loginSchema } from '#lib/schemas/auth.ts';
import { api } from '#lib/server/api/client.ts';
import { isApiFailure } from '#lib/server/api/errors.ts';
import { clearSession, writeSession } from '#lib/server/api/session.ts';
import { forgetUser } from '#lib/server/auth.ts';
import { safeNext } from '#lib/server/guard.ts';

export const getMe = query(async () => getRequestEvent().locals.user);

/**
 * Enhanced (JS) submissions go to the remote endpoint and get `{ next }` back so the page can play its
 * transition; plain form posts (no JS yet, e.g. before hydration) are redirected by the server.
 */
function finish(next: string) {
	if (!getRequestEvent().url.pathname.startsWith('/_app/remote/')) redirect(303, next);
	return { next };
}

export const login = form(loginSchema, async ({ login, password, next }) => {
	const event = getRequestEvent();
	let tokens: TokenResponse;
	try {
		tokens = await api.post<TokenResponse>('/api/auth/login', { login, password }, { anonymous: true });
	} catch (error) {
		if (isApiFailure(error) && error.status < 500) invalid(error.message);
		throw error;
	}
	event.locals.session = writeSession(event.cookies, tokens, event.url.protocol === 'https:');
	return finish(tokens.mustChangePassword ? '/change-password' : safeNext(next));
});

export const logout = form(async () => {
	const event = getRequestEvent();
	const { access, refresh } = event.locals.session;
	if (refresh) {
		await api.post('/api/auth/logout', { refreshToken: refresh }).catch(() => undefined);
	}
	forgetUser(access);
	event.locals.session = clearSession(event.cookies);
	redirect(303, '/login');
});

export const changePassword = form(changePasswordSchema, async ({ oldPassword, newPassword }, issue) => {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user) redirect(303, '/login');
	try {
		await api.post('/api/auth/change-password', { oldPassword, newPassword });
	} catch (error) {
		if (isApiFailure(error) && error.backendMessage === 'Invalid password') {
			invalid(issue.oldPassword(error.message));
		}
		if (isApiFailure(error) && error.status < 500) invalid(error.message);
		throw error;
	}
	// The backend revoked every refresh session; sign in again with the new password.
	forgetUser(event.locals.session.access);
	event.locals.session = clearSession(event.cookies);
	const tokens = await api.post<TokenResponse>(
		'/api/auth/login',
		{ login: user.login, password: newPassword },
		{ anonymous: true }
	);
	event.locals.session = writeSession(event.cookies, tokens, event.url.protocol === 'https:');
	return finish('/');
});
