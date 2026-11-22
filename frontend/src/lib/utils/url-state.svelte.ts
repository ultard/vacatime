import { goto } from '$app/navigation';
import { page } from '$app/state';

/**
 * Query-string state that applies changes immediately and lets the URL catch up.
 *
 * `page.url` only changes once a navigation completes, so deriving the next state from it while a
 * previous `goto` is still in flight would build on stale values (two quick filter clicks would lose
 * the first one). Pending changes are kept locally until their navigation lands.
 */
export function optimisticSearch() {
	let pending = $state<string | null>(null);

	return {
		get params(): URLSearchParams {
			return new URLSearchParams(pending ?? page.url.search);
		},
		/** `search` is a full query string, with or without the leading "?". */
		go(path: string, search: string) {
			const normalized = search && !search.startsWith('?') ? `?${search}` : search;
			pending = normalized;
			goto(`${path}${normalized}`, { replace: true, reset: false }).finally(() => {
				if (pending === normalized) pending = null;
			});
		}
	};
}
