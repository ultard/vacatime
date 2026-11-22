import { getRequestEvent } from '$app/server';
import { API_URL } from '$app/env/private';
import type { RequestEvent } from '@sveltejs/kit';
import type { TokenResponse } from '#lib/api/types.ts';
import { ApiFailure, readErrorBody } from './errors.ts';
import { clearSession, isAccessFresh, refreshOnce, writeSession } from './session.ts';

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
	query?: Record<string, QueryValue>;
	body?: unknown;
	/** Skip the bearer token (login / refresh). */
	anonymous?: boolean;
	event?: RequestEvent;
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
	const url = new URL(API_URL + path);
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value === undefined || value === null || value === '') continue;
		url.searchParams.set(key, String(value));
	}
	return url.toString();
}

async function send(
	method: string,
	path: string,
	options: RequestOptions,
	correlationId: string,
	token: string | null
): Promise<Response> {
	const headers: Record<string, string> = {
		Accept: 'application/json, text/csv;q=0.9',
		'X-Correlation-ID': correlationId
	};
	if (token) headers.Authorization = `Bearer ${token}`;
	let body: string | undefined;
	if (options.body !== undefined) {
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify(options.body);
	}
	try {
		return await fetch(buildUrl(path, options.query), { method, headers, body });
	} catch {
		throw new ApiFailure({
			status: 503,
			error: 'NETWORK_ERROR',
			message: 'Backend unreachable',
			correlationId
		});
	}
}

async function postRefresh(refreshToken: string, correlationId: string): Promise<TokenResponse | null> {
	const response = await send('POST', '/api/auth/refresh', { body: { refreshToken } }, correlationId, null);
	if (response.ok) return (await response.json()) as TokenResponse;
	if (response.status === 401 || response.status === 400) return null;
	throw new ApiFailure(await readErrorBody(response, correlationId));
}

/** Make sure `event.locals.session.access` is fresh, refreshing (once) when needed. */
export async function ensureAccess(event: RequestEvent, force = false): Promise<string | null> {
	const session = event.locals.session;
	if (!force && isAccessFresh(session.access)) return session.access;
	if (!session.refresh) return null;
	const tokens = await refreshOnce(session.refresh, (token) =>
		postRefresh(token, event.locals.correlationId)
	);
	if (!tokens) {
		event.locals.session = clearSession(event.cookies);
		return null;
	}
	event.locals.session = writeSession(event.cookies, tokens, event.url.protocol === 'https:');
	return tokens.accessToken;
}

/** Low-level request: handles auth, one retry after a 401, and error parsing. */
export async function apiResponse(method: string, path: string, options: RequestOptions = {}): Promise<Response> {
	const event = options.event ?? getRequestEvent();
	const correlationId = event.locals.correlationId;
	let token = options.anonymous ? null : await ensureAccess(event);
	if (!options.anonymous && !token) {
		throw new ApiFailure({ status: 401, error: 'UNAUTHORIZED', message: 'Invalid refresh token', correlationId });
	}
	let response = await send(method, path, options, correlationId, token);
	if (response.status === 401 && !options.anonymous) {
		token = await ensureAccess(event, true);
		if (token) response = await send(method, path, options, correlationId, token);
	}
	if (!response.ok) throw new ApiFailure(await readErrorBody(response, correlationId));
	return response;
}

async function parse<T>(response: Response): Promise<T> {
	const text = await response.text();
	if (!text) return undefined as T;
	const type = response.headers.get('content-type') ?? '';
	return (type.includes('json') ? JSON.parse(text) : text) as T;
}

export const api = {
	get: async <T>(path: string, options?: RequestOptions) => parse<T>(await apiResponse('GET', path, options)),
	post: async <T>(path: string, body?: unknown, options?: RequestOptions) =>
		parse<T>(await apiResponse('POST', path, { ...options, body })),
	put: async <T>(path: string, body?: unknown, options?: RequestOptions) =>
		parse<T>(await apiResponse('PUT', path, { ...options, body })),
	delete: async <T>(path: string, options?: RequestOptions) =>
		parse<T>(await apiResponse('DELETE', path, options))
};
