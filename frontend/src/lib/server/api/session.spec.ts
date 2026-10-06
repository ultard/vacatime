import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TokenResponse } from '#lib/api/types.ts';
import { isAccessFresh, jwtExpiry, refreshOnce, resetRefreshCache } from './session.ts';

const jwt = (exp: number) =>
	`h.${Buffer.from(JSON.stringify({ sub: 'x', exp })).toString('base64url')}.s`;

afterEach(() => resetRefreshCache());

describe('jwt helpers', () => {
	it('reads exp in ms', () => {
		expect(jwtExpiry(jwt(100))).toBe(100_000);
		expect(jwtExpiry('garbage')).toBeNull();
	});

	it('treats tokens about to expire as stale', () => {
		const now = 1_000_000;
		expect(isAccessFresh(jwt(now / 1000 + 120), now)).toBe(true);
		expect(isAccessFresh(jwt(now / 1000 + 10), now)).toBe(false);
		expect(isAccessFresh(null, now)).toBe(false);
	});
});

describe('refreshOnce', () => {
	const tokens: TokenResponse = { accessToken: 'a2', refreshToken: 'r2', mustChangePassword: false };

	it('shares one refresh between concurrent callers', async () => {
		const doRefresh = vi.fn(async () => tokens);
		const [a, b] = await Promise.all([refreshOnce('r1', doRefresh), refreshOnce('r1', doRefresh)]);
		expect(doRefresh).toHaveBeenCalledTimes(1);
		expect(a).toBe(tokens);
		expect(b).toBe(tokens);
	});

	it('reuses a settled result for late requests carrying the old token', async () => {
		const doRefresh = vi.fn(async () => tokens);
		await refreshOnce('r1', doRefresh);
		await expect(refreshOnce('r1', doRefresh)).resolves.toBe(tokens);
		expect(doRefresh).toHaveBeenCalledTimes(1);
	});

	it('forgets failed refreshes so they can be retried', async () => {
		const doRefresh = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(tokens);
		await expect(refreshOnce('r1', doRefresh)).rejects.toThrow('network');
		await expect(refreshOnce('r1', doRefresh)).resolves.toBe(tokens);
	});
});
