<script lang="ts">
	import { page } from '$app/state';
	import List from '@lucide/svelte/icons/list';
	import ChartGantt from '@lucide/svelte/icons/chart-gantt';
	import Kanban from '@lucide/svelte/icons/kanban';
	import { m } from '#lib/paraglide/messages.js';

	const tabs = [
		{ href: '/vacations', label: m.nav_vacations_list, icon: List },
		{ href: '/vacations/timeline', label: m.nav_timeline, icon: ChartGantt },
		{ href: '/vacations/board', label: m.nav_board, icon: Kanban }
	];
</script>

<nav class="bg-muted inline-flex rounded-lg p-1" aria-label={m.vac_title()}>
	{#each tabs as tab (tab.href)}
		{@const active = page.url.pathname === tab.href}
		<a
			href="{tab.href}{page.url.search}"
			aria-current={active ? 'page' : undefined}
			class="text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors aria-[current=page]:shadow-sm"
		>
			<tab.icon class="size-4" />
			<span class="hidden sm:inline">{tab.label()}</span>
		</a>
	{/each}
</nav>
