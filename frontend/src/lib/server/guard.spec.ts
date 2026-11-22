import { describe, expect, it } from 'vitest';
import { toSessionUser, type Role } from '#lib/api/types.ts';
import { guard, safeNext } from './guard.ts';

const user = (roles: Role[], mustChangePassword = false) =>
	toSessionUser({ id: '1', login: 'u', fullName: 'U', roles, active: true, mustChangePassword });

describe('guard', () => {
	it('sends anonymous users to login with next', () => {
		expect(guard('/vacations', '?status=PENDING', null)).toEqual({
			type: 'redirect',
			location: '/login?next=%2Fvacations%3Fstatus%3DPENDING'
		});
		expect(guard('/', '', null)).toEqual({ type: 'redirect', location: '/login' });
		expect(guard('/login', '', null)).toEqual({ type: 'ok' });
	});

	it('forces a password change', () => {
		const u = user(['ADMIN'], true);
		expect(guard('/vacations', '', u)).toEqual({ type: 'redirect', location: '/change-password' });
		expect(guard('/change-password', '', u)).toEqual({ type: 'ok' });
	});

	it('keeps signed-in users away from auth pages', () => {
		expect(guard('/login', '', user(['VIEWER']))).toEqual({ type: 'redirect', location: '/' });
		expect(guard('/change-password', '', user(['VIEWER']))).toEqual({ type: 'redirect', location: '/' });
	});

	it('applies the role matrix', () => {
		expect(guard('/admin/users', '', user(['EDITOR']))).toEqual({ type: 'forbidden' });
		expect(guard('/admin/users', '', user(['ADMIN']))).toEqual({ type: 'ok' });
		expect(guard('/vacations/new', '', user(['VIEWER']))).toEqual({ type: 'forbidden' });
		expect(guard('/vacations/import', '', user(['EDITOR']))).toEqual({ type: 'ok' });
		expect(guard('/vacations/abc/edit', '', user(['VIEWER']))).toEqual({ type: 'forbidden' });
		expect(guard('/vacations/abc', '', user(['VIEWER']))).toEqual({ type: 'ok' });
		expect(guard('/administrator', '', user(['VIEWER']))).toEqual({ type: 'ok' });
	});
});

describe('safeNext', () => {
	it('allows only same-site relative paths', () => {
		expect(safeNext('/vacations?x=1')).toBe('/vacations?x=1');
		expect(safeNext('//evil.com')).toBe('/');
		expect(safeNext('/\\evil.com')).toBe('/');
		expect(safeNext('https://evil.com')).toBe('/');
		expect(safeNext(undefined)).toBe('/');
	});
});
