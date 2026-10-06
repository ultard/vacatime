<script lang="ts">
	import { goto } from '$app/navigation';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import EmptyState from '#lib/components/app/empty-state.svelte';
	import ViewTabs from '#lib/components/vacations/view-tabs.svelte';
	import VacationFilters from '#lib/components/vacations/vacation-filters.svelte';
	import VacationDrawer from '#lib/components/vacations/vacation-drawer.svelte';
	import TimelineChart from '#lib/components/vacations/timeline-chart.svelte';
	import { VACATION_STATUSES, type VacationDto } from '#lib/api/types.ts';
	import { listAllVacations } from '#lib/remote/vacations.remote.ts';
	import { listEmployees, listVacationTypes } from '#lib/remote/dictionaries.remote.ts';
	import { statusLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { optimisticSearch } from '#lib/utils/url-state.svelte.ts';
	import { addDays, formatRange, todayIso } from '#lib/utils/date.ts';
	import { shiftWindow, windowFor, type Zoom } from '#lib/utils/timeline.ts';
	import { readState, toFilter, writeState, type VacationUrlState } from '#lib/utils/vacation-filters.ts';

	const ZOOMS: Zoom[] = ['month', 'quarter', 'year'];
	const zoomLabels = { month: m.tl_zoom_month, quarter: m.tl_zoom_quarter, year: m.tl_zoom_year };

	const search = optimisticSearch();
	const filters = $derived(readState(search.params));
	const zoom = $derived<Zoom>(ZOOMS.find((z) => z === search.params.get('zoom')) ?? 'quarter');
	const anchor = $derived(/^\d{4}-\d{2}-\d{2}$/.test(search.params.get('at') ?? '') ? search.params.get('at')! : todayIso());
	const timeWindow = $derived(windowFor(anchor, zoom));

	// The API filters on start date only, so look back far enough to catch vacations that began earlier.
	const query = $derived(
		listAllVacations({
			...toFilter(filters),
			startDateFrom: addDays(timeWindow.from, -120),
			startDateTo: timeWindow.to
		})
	);
	const types = listVacationTypes();
	const employees = listEmployees();

	function navigate(params: { zoom?: Zoom; at?: string; filters?: Partial<VacationUrlState> }) {
		const next = new URLSearchParams(writeState({ ...filters, ...params.filters, page: 0 }));
		next.set('zoom', params.zoom ?? zoom);
		next.set('at', params.at ?? anchor);
		search.go('/vacations/timeline', next.toString());
	}

	function changeZoom(direction: -1 | 1) {
		const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(zoom) + direction))];
		if (next !== zoom) navigate({ zoom: next });
	}

	function open(vacation: VacationDto) {
		goto(`/vacations/${vacation.id}`, { shallow: true, state: { vacationId: vacation.id } });
	}
</script>

<svelte:head><title>{m.tl_title()} · {m.app_name()}</title></svelte:head>

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
			onchange={(patch) => navigate({ filters: patch })}
			showSort={false}
		/>
	</svelte:boundary>

	<div class="flex flex-wrap items-center gap-2">
		<div class="flex items-center gap-1">
			<Button variant="outline" size="icon" aria-label={m.tl_prev()} onclick={() => navigate({ at: shiftWindow(anchor, zoom, -1) })}>
				<ChevronLeft />
			</Button>
			<Button variant="outline" onclick={() => navigate({ at: todayIso() })}>{m.tl_today()}</Button>
			<Button variant="outline" size="icon" aria-label={m.tl_next()} onclick={() => navigate({ at: shiftWindow(anchor, zoom, 1) })}>
				<ChevronRight />
			</Button>
		</div>
		<span class="text-sm font-medium tabular-nums">{formatRange(timeWindow.from, timeWindow.to)}</span>
		<div class="bg-muted ml-auto inline-flex rounded-lg p-1" role="radiogroup" aria-label={m.tl_zoom_hint()}>
			{#each ZOOMS as z (z)}
				<button
					type="button"
					role="radio"
					aria-checked={zoom === z}
					onclick={() => navigate({ zoom: z })}
					class="text-muted-foreground aria-checked:bg-background aria-checked:text-foreground rounded-md px-3 py-1 text-sm aria-checked:shadow-sm"
				>
					{zoomLabels[z]()}
				</button>
			{/each}
		</div>
	</div>

	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-96 w-full" />{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		{@const vacations = (await query).filter((v) => v.endDate >= timeWindow.from)}
		{#if vacations.length === 0}
			<EmptyState title={m.tl_empty()} />
		{:else}
			<div class:opacity-60={query.loading} class="transition-opacity">
				<TimelineChart {vacations} window={timeWindow} {zoom} onopen={open} onzoom={changeZoom} />
			</div>
		{/if}
	</svelte:boundary>

	<div class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" aria-label={m.tl_legend()}>
		{#each VACATION_STATUSES as status (status)}
			<span class="flex items-center gap-1.5">
				<span class="size-3 rounded-sm" style:background="var(--status-{status.toLowerCase()})"></span>
				{statusLabel(status)}
			</span>
		{/each}
		<span class="ml-auto">{m.tl_zoom_hint()}</span>
	</div>
</div>

<VacationDrawer />
