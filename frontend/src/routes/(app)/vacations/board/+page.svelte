<script lang="ts">
	import { goto } from '$app/navigation';
	import Info from '@lucide/svelte/icons/info';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import ViewTabs from '#lib/components/vacations/view-tabs.svelte';
	import VacationFilters from '#lib/components/vacations/vacation-filters.svelte';
	import VacationDrawer from '#lib/components/vacations/vacation-drawer.svelte';
	import KanbanBoard from '#lib/components/vacations/kanban-board.svelte';
	import type { VacationDto } from '#lib/api/types.ts';
	import { listAllVacations } from '#lib/remote/vacations.remote.ts';
	import { listEmployees, listVacationTypes } from '#lib/remote/dictionaries.remote.ts';
	import { getUser } from '#lib/context.ts';
	import { optimisticSearch } from '#lib/utils/url-state.svelte.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { readState, toFilter, writeState, type VacationUrlState } from '#lib/utils/vacation-filters.ts';

	const user = getUser();
	const search = optimisticSearch();
	const filters = $derived(readState(search.params));
	// The board never shows archived vacations; status is the board's own dimension.
	const query = $derived(listAllVacations({ ...toFilter(filters), status: undefined, archived: false }));
	const types = listVacationTypes();
	const employees = listEmployees();

	function update(patch: Partial<VacationUrlState>) {
		search.go('/vacations/board', writeState({ ...filters, ...patch, page: 0 }));
	}

	function open(vacation: VacationDto) {
		goto(`/vacations/${vacation.id}`, { shallow: true, state: { vacationId: vacation.id } });
	}
</script>

<svelte:head><title>{m.board_title()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-5 py-6">
	<div class="flex flex-wrap items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{m.vac_title()}</h1>
		<ViewTabs />
	</div>
	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-9 w-full" />{/snippet}
		<VacationFilters
			{filters}
			types={await types}
			employees={(await employees).employees}
			employeesComplete={(await employees).complete}
			onchange={update}
			showSort={false}
		/>
	</svelte:boundary>
	<p class="text-muted-foreground flex items-start gap-2 text-sm">
		<Info class="mt-0.5 size-4 shrink-0" />
		{user().canEdit ? m.board_hint() : m.board_readonly()}
	</p>
	<svelte:boundary>
		{#snippet pending()}
			<div class="grid grid-cols-5 gap-3">{#each Array(5) as _, i (i)}<Skeleton class="h-96" />{/each}</div>
		{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		<KanbanBoard {query} vacations={await query} editable={user().canEdit} onopen={open} />
	</svelte:boundary>
</div>

<VacationDrawer />
