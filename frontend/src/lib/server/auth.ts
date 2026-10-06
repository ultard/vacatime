import type { RequestEvent } from '@sveltejs/kit';
import { toSessionUser, type SessionUser, type UserDto } from '#lib/api/types.ts';
import { api } from './api/client.ts';
import { isApiFailure } from './api/errors.ts';
import { clearSession } from './api/session.ts';

const USER_CACHE_MS = 15_000;
const userCache = new Map<string, { user: SessionUser; at: number }>();

export function forgetUser(accessToken: string | null) {
	if (accessToken) userCache.delete(accessToken);
}

/** Resolve the current user for this request (cached briefly per access token). */
export async function loadUser(event: RequestEvent): Promise<SessionUser | null> {
	const { session } = event.locals;
	if (!session.access && !session.refresh) return null;
	const cached = session.access ? userCache.get(session.access) : undefined;
	if (cached && Date.now() - cached.at < USER_CACHE_MS) return cached.user;
	try {
		const user = toSessionUser(await api.get<UserDto>('/api/auth/me', { event }));
		const token = event.locals.session.access;
		if (token) {
			if (userCache.size > 500) userCache.clear();
			userCache.set(token, { user, at: Date.now() });
		}
		return user;
	} catch (error) {
		if (isApiFailure(error) && (error.status === 401 || error.status === 403)) {
			event.locals.session = clearSession(event.cookies);
			return null;
		}
		if (isApiFailure(error) && error.status === 503) return null;
		throw error;
	}
}
