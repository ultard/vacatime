<script lang="ts">
	import './layout.css';
	import { onNavigate } from '$app/navigation';
	import { updated } from '$app/state';
	import { ModeWatcher } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import favicon from '#lib/assets/favicon.svg';
	import { m } from '#lib/paraglide/messages.js';

	let { children } = $props();

	// Cross-fade between pages with the View Transitions API.
	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Kit 3 detects new deployments on responses, focus and visibility changes.
	$effect(() => {
		if (updated.current) {
			toast.info(m.new_version(), {
				duration: Infinity,
				action: { label: m.reload(), onClick: () => location.reload() }
			});
		}
	});
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="theme-color" content="#1f6f8b" />
	<title>{m.app_name()}</title>
</svelte:head>

<ModeWatcher />
<Toaster richColors closeButton position="bottom-right" />
{@render children()}
