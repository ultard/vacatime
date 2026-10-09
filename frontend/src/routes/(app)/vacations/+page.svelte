<script lang="ts">
	import { goto } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import Plus from '@lucide/svelte/icons/plus';
	import Download from '@lucide/svelte/icons/download';
	import FileUp from '@lucide/svelte/icons/file-up';
	import SearchX from '@lucide/svelte/icons/search-x';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import EmptyState from '#lib/components/app/empty-state.svelte';
	import Pager from '#lib/components/app/pager.svelte';
	import ViewTabs from '#lib/components/vacations/view-tabs.svelte';
	import VacationFilters from '#lib/components/vacations/vacation-filters.svelte';
	import VacationTable from '#lib/components/vacations/vacation-table.svelte';
	import BulkBar from '#lib/components/vacations/bulk-bar.svelte';
	import VacationDrawer from '#lib/components/vacations/vacation-drawer.svelte';
	import type { VacationDto } from '#lib/api/types.ts';
	import { listVacations } from '#lib/remote/vacations.remote.ts';
	import { listEmployees, listVacationTypes } from '#lib/remote/dictionaries.remote.ts';
	import { getUser } from '#lib/context.ts';
	import { optimisticSearch } from '#lib/utils/url-state.svelte.ts';
	import { m } from '#lib/paraglide/messages.js';
	import {
		countFilters,
		exportQuery,
		readState,
		toListParams,
		writeState,
		type VacationUrlState
	} from '#lib/utils/vacation-filters.ts';

	const user = getUser();
	const search = optimisticSearch();
	const filters = $derived(readState(search.params));
	const query = $derived(listVacations(toListParams(filters)));
	const types = listVacationTypes();
	const employees = listEmployees();

	const selected = new SvelteSet<string>();
	// Plain map: only read when the bulk error report opens.
	const titles = new Map<string, string>();

	function update(patch: Partial<VacationUrlState>) {
		const next = { ...filters, ...patch, page: patch.page ?? 0 };
		if (next.page !== filters.page || patch.page === undefined) selected.clear();
		search.go('/vacations', writeState(next));
	}

	function open(vacation: VacationDto) {
		goto(`/vacations/${vacation.id}`, { shallow: true, state: { vacationId: vacation.id } });
	}

	function remember(list: VacationDto[]) {
		for (const v of list) titles.set(v.id, v.title);
		return list;
	}
</script>

<svelte:head><title>{m.vac_title()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-5 py-6">
	<div class="flex flex-wrap items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{m.vac_title()}</h1>
		<ViewTabs />
		<div class="ml-auto flex flex-wrap gap-2">
			<Button variant="outline" href="/vacations/export?{exportQuery(filters)}" data-sveltekit-reload download>
				<Download />{m.vac_export()}
			</Button>
			{#if user().canEdit}
				<Button variant="outline" href="/vacations/import"><FileUp />{m.nav_import()}</Button>
				<Button href="/vacations/new"><Plus />{m.nav_new_vacation()}</Button>
			{/if}
		</div>
	</div>

	<svelte:boundary>
		{#snippet pending()}
			<Skeleton class="h-9 w-full" />
		{/snippet}
		<VacationFilters
			{filters}
			types={await types}
			employees={(await employees).employees}
			employeesComplete={(await employees).complete}
			onchange={update}
		/>
	</svelte:boundary>

	<svelte:boundary>
		{#snippet pending()}
			<div class="grid gap-2">
				{#each Array(8) as _, i (i)}<Skeleton class="h-14 w-full" />{/each}
			</div>
		{/snippet}
		{#snippet failed(error, reset)}
			<ErrorState {error} {reset} />
		{/snippet}
		{@const result = await query}
		{#if result.content.length === 0}
			<EmptyState
				icon={SearchX}
				title={countFilters(filters) || filters.search ? m.empty_filtered() : m.empty_title()}
			>
				{#if countFilters(filters) || filters.search}
					<Button variant="outline" href="/vacations">{m.reset_filters()}</Button>
				{/if}
			</EmptyState>
		{:else}
			<div class="grid gap-3 transition-opacity" class:opacity-60={query.loading}>
				<p class="text-muted-foreground text-sm tabular-nums">{m.vac_total({ count: result.totalElements })}</p>
				<VacationTable vacations={remember(result.content)} {selected} selectable={user().canEdit} onopen={open} />
				<Pager
					page={result.page}
					totalPages={result.totalPages}
					size={filters.size}
					onpage={(p) => update({ page: p })}
					onsize={(size) => update({ size })}
				/>
			</div>
		{/if}
	</svelte:boundary>
</div>

<BulkBar {selected} {titles} updates={[query]} />
<VacationDrawer />
