import { error } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { guard } from '#lib/server/guard.ts';
import type { LayoutServerLoad } from './$types';

/** Role check for (app) pages; thrown here (not in hooks) so the 403 renders with +error.svelte. */
export const load: LayoutServerLoad = ({ locals, url }) => {
	if (guard(url.pathname, url.search, locals.user).type === 'forbidden') error(403, m.err_forbidden());
};
