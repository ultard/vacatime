import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$app/env/private', () => ({ API_URL: 'http://api.test' }));
vi.mock('$app/server', () => ({ getRequestEvent: () => undefined }));

const { api, buildUrl } = await import('./client.ts');
const { ApiFailure } = await import('./errors.ts');
const { resetRefreshCache } = await import('./session.ts');

const jwt = (secondsFromNow: number) =>
	`h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow })).toString('base64url')}.s`;

function fakeEvent(access: string | null, refresh: string | null) {
	const jar = new Map<string, string>();
	const event = {
		url: new URL('http://localhost/'),
		locals: { session: { access, refresh }, user: null, correlationId: 'cid-1' },
		cookies: {
			get: (k: string) => jar.get(k),
			set: (k: string, v: string) => void jar.set(k, v),
			delete: (k: string) => void jar.delete(k)
		}
	};
	return { event: event as unknown as RequestEvent, jar };
}

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
	vi.unstubAllGlobals();
	resetRefreshCache();
});

describe('buildUrl', () => {
	it('skips empty query values', () => {
		expect(buildUrl('/api/vacations', { page: 0, search: '', status: undefined, urgent: false })).toBe(
			'http://api.test/api/vacations?page=0&urgent=false'
		);
	});
});

describe('api client', () => {
	it('sends bearer token and correlation id', async () => {
		const fetchMock = vi.fn(async () => json(200, { ok: 1 }));
		vi.stubGlobal('fetch', fetchMock);
		const token = jwt(600);
		const { event } = fakeEvent(token, 'r1');
		await expect(api.get('/api/x', { event })).resolves.toEqual({ ok: 1 });
		const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(init.headers).toMatchObject({ Authorization: `Bearer ${token}`, 'X-Correlation-ID': 'cid-1' });
	});

	it('refreshes an expired access token before calling', async () => {
		const fresh = jwt(900);
		const fetchMock = vi.fn(async (url: string) =>
			url.endsWith('/api/auth/refresh')
				? json(200, { accessToken: fresh, refreshToken: 'r2', mustChangePassword: false })
				: json(200, [])
		);
		vi.stubGlobal('fetch', fetchMock);
		const { event, jar } = fakeEvent(jwt(-10), 'r1');
		await api.get('/api/x', { event });
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(jar.get('vt_rt')).toBe('r2');
		expect(event.locals.session.access).toBe(fresh);
	});

	it('retries once after a 401 with a forced refresh', async () => {
		const fresh = jwt(900);
		let calls = 0;
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url.endsWith('/refresh')) return json(200, { accessToken: fresh, refreshToken: 'r2', mustChangePassword: false });
				calls++;
				return calls === 1 ? json(401, { status: 401, error: 'UNAUTHORIZED', message: 'Authentication is required' }) : json(200, 'ok');
			})
		);
		const { event } = fakeEvent(jwt(600), 'r1');
		await expect(api.get('/api/x', { event })).resolves.toBe('ok');
		expect(calls).toBe(2);
	});

	it('clears the session when refresh is rejected', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => json(401, { status: 401, error: 'UNAUTHORIZED', message: 'Invalid refresh token' })));
		const { event } = fakeEvent(null, 'dead');
		await expect(api.get('/api/x', { event })).rejects.toMatchObject({ status: 401 });
		expect(event.locals.session).toEqual({ access: null, refresh: null });
	});

	it('parses API errors into ApiFailure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				json(409, { status: 409, error: 'CONFLICT', message: 'Employee has an overlapping active vacation', correlationId: 'srv' })
			)
		);
		const { event } = fakeEvent(jwt(600), 'r1');
		const failure = await api.post('/api/vacations', {}, { event }).catch((e) => e);
		expect(failure).toBeInstanceOf(ApiFailure);
		expect(failure).toMatchObject({ status: 409, code: 'CONFLICT', correlationId: 'srv' });
	});

	it('maps network failures to 503', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
		const { event } = fakeEvent(null, null);
		await expect(api.post('/api/auth/login', {}, { event, anonymous: true })).rejects.toMatchObject({
			status: 503,
			code: 'NETWORK_ERROR'
		});
	});
});
