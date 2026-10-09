<script lang="ts">
	import { navigating } from '$app/state';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import AppSidebar from '#lib/components/app/app-sidebar.svelte';
	import Topbar from '#lib/components/app/topbar.svelte';
	import CommandPalette from '#lib/components/app/command-palette.svelte';
	import { setUser } from '#lib/context.ts';
	import type { SessionUser } from '#lib/api/types.ts';
	import { getMe } from '#lib/remote/auth.remote.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { children } = $props();

	// The hooks guard guarantees a user for every (app) route. Context must be set before
	// the first await, so it reads the query lazily.
	let user = $state<SessionUser | null>(null);
	setUser(() => user!);
	const me = getMe();
	user = await me;
	$effect(() => {
		if (me.current) user = me.current;
	});

	let paletteOpen = $state(false);
</script>

<a
	href="#main"
	class="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
>
	{m.skip_to_content()}
</a>

{#if navigating.to}
	<div class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden" aria-hidden="true">
		<div class="bg-primary h-full w-1/3 animate-[progress_1s_ease-in-out_infinite]"></div>
	</div>
{/if}

{#if user}
<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset class="min-w-0">
		<Topbar onsearch={() => (paletteOpen = true)} />
		<main id="main" class="@container/main flex-1 px-4 pb-10 sm:px-6" style:view-transition-name="main">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>

<CommandPalette bind:open={paletteOpen} />
{/if}

<style>
	@keyframes -global-progress {
		from {
			translate: -100% 0;
		}
		to {
			translate: 300% 0;
		}
	}
</style>
