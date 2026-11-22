<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import ThemeToggle from './theme-toggle.svelte';
	import LocaleToggle from './locale-toggle.svelte';

	let { onsearch }: { onsearch: () => void } = $props();
</script>

<header
	class="bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-4 backdrop-blur-md sm:px-6"
>
	<!-- On phones the sidebar is an off-canvas sheet, so it needs an opener outside of it. -->
	<Sidebar.Trigger class="-ml-1 md:hidden" aria-label={m.toggle_sidebar()} />
	<button
		type="button"
		onclick={onsearch}
		aria-label={m.cmd_search()}
		class="border-input bg-muted/40 text-muted-foreground hover:bg-muted flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 text-sm transition-colors sm:max-w-sm"
	>
		<Search class="size-4" />
		<span class="truncate max-sm:sr-only">{m.cmd_placeholder()}</span>
		<Kbd class="ml-auto hidden sm:inline-flex">⌘K</Kbd>
	</button>
	<div class="ml-auto flex shrink-0 items-center gap-1">
		<LocaleToggle />
		<ThemeToggle />
	</div>
</header>
