<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Building from '@lucide/svelte/icons/building-2';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import EmptyState from '#lib/components/app/empty-state.svelte';
	import NativeSelect from '#lib/components/app/native-select.svelte';
	import Heatmap from '#lib/components/availability/heatmap.svelte';
	import Legend from '#lib/components/availability/legend.svelte';
	import { getAvailability } from '#lib/remote/analytics.remote.ts';
	import { listDepartments } from '#lib/remote/dictionaries.remote.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { addDays, formatDate, todayIso } from '#lib/utils/date.ts';
	import { clampRange } from '#lib/utils/availability.ts';

	const today = todayIso();
	const params = $derived(
		clampRange(page.url.searchParams.get('from'), page.url.searchParams.get('to'), today)
	);
	const departmentId = $derived(page.url.searchParams.get('department') || undefined);
	const query = $derived(getAvailability({ ...params, departmentId }));
	const departments = listDepartments();

	function update(patch: { from?: string; to?: string; department?: string }) {
		const search = new URLSearchParams(page.url.search);
		for (const [key, value] of Object.entries(patch)) {
			if (value) search.set(key, value);
			else search.delete(key);
		}
		goto(`/availability?${search}`, { replace: true, reset: false });
	}

	const presets = [
		{ label: m.av_presets_2w, days: 13 },
		{ label: m.av_presets_month, days: 29 },
		{ label: m.av_presets_quarter, days: 89 }
	];
	let departmentValue = $derived(departmentId ?? '');
</script>

<svelte:head><title>{m.av_title()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-5 py-6">
	<header class="grid gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{m.av_title()}</h1>
		<p class="text-muted-foreground text-sm">{m.av_subtitle()}</p>
	</header>

	<div class="flex flex-wrap items-end gap-3">
		<div class="grid gap-1.5">
			<Label for="av-from">{m.av_period()}</Label>
			<div class="flex items-center gap-1">
				<Input id="av-from" type="date" class="w-40" min={today} value={params.from} onchange={(e) => update({ from: e.currentTarget.value })} />
				<span class="text-muted-foreground">–</span>
				<Input type="date" class="w-40" min={params.from} max={addDays(params.from, 365)} value={params.to} onchange={(e) => update({ to: e.currentTarget.value })} aria-label={m.date_to()} />
			</div>
		</div>
		<div class="flex gap-1">
			{#each presets as preset (preset.days)}
				<button
					type="button"
					class="hover:bg-muted rounded-full border px-3 py-1.5 text-sm"
					onclick={() => update({ from: today, to: addDays(today, preset.days) })}
				>
					{preset.label()}
				</button>
			{/each}
		</div>
		<div class="grid gap-1.5">
			<Label for="av-dep">{m.av_department()}</Label>
			<svelte:boundary>
				{#snippet pending()}<Skeleton class="h-9 w-56" />{/snippet}
				<NativeSelect
					id="av-dep"
					class="w-56"
					bind:value={departmentValue}
					placeholder={m.av_all_departments()}
					options={(await departments).map((d) => ({ value: d.id, label: d.name }))}
					onchange={() => update({ department: departmentValue })}
				/>
			</svelte:boundary>
		</div>
		<p class="text-muted-foreground pb-2 text-xs">{m.av_range_hint()}</p>
	</div>

	<Legend />

	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-96 w-full" />{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		{@const data = await query}
		{#if data.departments.every((d) => d.shifts.length === 0)}
			<EmptyState icon={Building} title={m.av_no_shifts()} />
		{:else}
			<div class:opacity-60={query.loading} class="transition-opacity">
				<Heatmap {data} />
			</div>
			{@const shortageDays = data.departments.flatMap((d) =>
				d.shifts.flatMap((s) =>
					s.days.filter((day) => day.forecastShortage).map((day) => ({ department: d.name, shift: s.name, day }))
				)
			).sort((a, b) => a.day.date.localeCompare(b.day.date))}
			<section class="grid gap-3">
				<h2 class="font-semibold">{m.av_shortages()}</h2>
				{#if shortageDays.length === 0}
					<p class="text-muted-foreground text-sm">{m.av_no_shortages()}</p>
				{:else}
					<ul class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
						{#each shortageDays as item (item.department + item.shift + item.day.date)}
							<li class="bg-card flex items-center gap-3 rounded-xl border p-3 text-sm">
								<span class="heat size-3 shrink-0 rounded" data-level={item.day.confirmedShortage ? 'confirmed' : 'forecast'}></span>
								<span class="grid min-w-0 flex-1">
									<span class="truncate font-medium">{formatDate(item.day.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {item.shift}</span>
									<span class="text-muted-foreground truncate text-xs">
										{item.department} · {m.av_cell_available({ now: item.day.availableAfterApproved ?? 0, forecast: item.day.forecastAvailable ?? 0 })} / {item.day.minimumStaff}
									</span>
								</span>
								{#if (item.day.pendingAbsent ?? 0) > 0}
									<a
										class="text-primary shrink-0 text-xs hover:underline"
										href="/vacations?status=PENDING&to={item.day.date}"
										title={m.av_pending_link()}
									>
										{m.av_cell_pending({ count: item.day.pendingAbsent ?? 0 })}
									</a>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</svelte:boundary>
</div>
