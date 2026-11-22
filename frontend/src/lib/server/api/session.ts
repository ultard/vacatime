import type { Cookies } from '@sveltejs/kit';
import type { TokenResponse } from '#lib/api/types.ts';

export const ACCESS_COOKIE = 'vt_at';
export const REFRESH_COOKIE = 'vt_rt';
const REFRESH_TTL_SECONDS = 14 * 24 * 60 * 60;
/** Refresh the access token this many ms before it expires. */
const EXPIRY_SKEW_MS = 30_000;
/** How long a completed refresh result is reused for late requests carrying the old token. */
const REUSE_WINDOW_MS = 30_000;

export interface Session {
	access: string | null;
	refresh: string | null;
}

/** Decode the `exp` claim (ms since epoch) of a JWT without verifying it. */
export function jwtExpiry(token: string): number | null {
	const payload = token.split('.')[1];
	if (!payload) return null;
	try {
		const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
		return typeof json.exp === 'number' ? json.exp * 1000 : null;
	} catch {
		return null;
	}
}

export function isAccessFresh(token: string | null, now = Date.now()): token is string {
	if (!token) return false;
	const exp = jwtExpiry(token);
	return exp !== null && exp - EXPIRY_SKEW_MS > now;
}

export function readSession(cookies: Cookies): Session {
	return {
		access: cookies.get(ACCESS_COOKIE) ?? null,
		refresh: cookies.get(REFRESH_COOKIE) ?? null
	};
}

export function writeSession(cookies: Cookies, tokens: TokenResponse, secure: boolean): Session {
	const exp = jwtExpiry(tokens.accessToken);
	const accessAge = exp ? Math.max(60, Math.floor((exp - Date.now()) / 1000)) : 15 * 60;
	const base = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure };
	cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: accessAge });
	cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: REFRESH_TTL_SECONDS });
	return { access: tokens.accessToken, refresh: tokens.refreshToken };
}

export function clearSession(cookies: Cookies): Session {
	cookies.delete(ACCESS_COOKIE, { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/' });
	return { access: null, refresh: null };
}

type RefreshFn = (refreshToken: string) => Promise<TokenResponse | null>;

const inflight = new Map<string, { promise: Promise<TokenResponse | null>; settledAt?: number }>();

/**
 * Exchange a refresh token exactly once per token. The backend rotates refresh tokens, so two
 * concurrent requests carrying the same (old) token must share a single refresh call; otherwise
 * the second one would be rejected and log the user out.
 */
export function refreshOnce(refreshToken: string, doRefresh: RefreshFn): Promise<TokenResponse | null> {
	const now = Date.now();
	for (const [key, entry] of inflight) {
		if (entry.settledAt && now - entry.settledAt > REUSE_WINDOW_MS) inflight.delete(key);
	}
	const existing = inflight.get(refreshToken);
	if (existing) return existing.promise;

	const entry: { promise: Promise<TokenResponse | null>; settledAt?: number } = {
		promise: doRefresh(refreshToken)
	};
	entry.promise.then(
		() => (entry.settledAt = Date.now()),
		() => inflight.delete(refreshToken)
	);
	inflight.set(refreshToken, entry);
	return entry.promise;
}

/** Test helper. */
export function resetRefreshCache() {
	inflight.clear();
}
