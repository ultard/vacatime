import type { SessionUser } from '#lib/api/types.ts';

/** Pure routing decision, unit-tested. */
export type GuardResult = { type: 'ok' } | { type: 'redirect'; location: string } | { type: 'forbidden' };

export function guard(pathname: string, search: string, user: SessionUser | null): GuardResult {
	const isLogin = pathname === '/login';
	const isChangePassword = pathname === '/change-password';
	if (!user) {
		if (isLogin) return { type: 'ok' };
		const next = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
		return { type: 'redirect', location: `/login${next}` };
	}
	if (user.mustChangePassword) {
		return isChangePassword ? { type: 'ok' } : { type: 'redirect', location: '/change-password' };
	}
	if (isLogin || isChangePassword) return { type: 'redirect', location: '/' };
	if (pathname === '/admin' || pathname.startsWith('/admin/')) {
		return user.isAdmin ? { type: 'ok' } : { type: 'forbidden' };
	}
	const editorOnly =
		pathname === '/vacations/new' || pathname === '/vacations/import' || /^\/vacations\/[^/]+\/edit$/.test(pathname);
	if (editorOnly && !user.canEdit) {
		return { type: 'forbidden' };
	}
	return { type: 'ok' };
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null | undefined): string {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
	return next;
}
