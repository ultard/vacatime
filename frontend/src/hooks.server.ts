import { redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { m } from '#lib/paraglide/messages.js';
import { readSession } from '#lib/server/api/session.ts';
import { isApiFailure } from '#lib/server/api/errors.ts';
import { loadUser } from '#lib/server/auth.ts';
import { guard } from '#lib/server/guard.ts';

const CORRELATION_RE = /^[a-zA-Z0-9._-]{1,100}$/;

const i18n: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ locale }) =>
		resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		})
	);

const session: Handle = async ({ event, resolve }) => {
	const incoming = event.request.headers.get('x-correlation-id');
	event.locals.correlationId = incoming && CORRELATION_RE.test(incoming) ? incoming : crypto.randomUUID();
	event.locals.session = readSession(event.cookies);
	event.locals.user = null;

	const path = event.url.pathname;
	const isAsset = path.startsWith('/_app/immutable') || path.startsWith('/favicon') || path === '/apple-touch-icon.png' || path === '/robots.txt';
	if (!isAsset) event.locals.user = await loadUser(event);

	// Page and endpoint routes are redirected here; 403s are raised by the (app) layout so that
	// they render with +error.svelte. Remote functions guard themselves.
	if (event.route.id && !isAsset) {
		const decision = guard(path, event.url.search, event.locals.user);
		if (decision.type === 'redirect') redirect(303, decision.location);
	}

	const response = await resolve(event);
	response.headers.set('X-Correlation-ID', event.locals.correlationId);
	return response;
};

export const handle = sequence(i18n, session);

export const handleError: HandleServerError = ({ kind, error: caught, event }) => {
	const correlationId = event.locals.correlationId ?? null;
	if (kind === 'unknown') {
		if (isApiFailure(caught)) return { ...caught.toAppError(), correlationId: caught.correlationId ?? correlationId };
		console.error(`[${correlationId}]`, caught);
		return { message: m.err_unknown(), code: 'INTERNAL_ERROR', correlationId };
	}
	if (kind === 'app') return { correlationId: caught.correlationId ?? correlationId };
	return { correlationId };
};
