<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import NativeSelect from '#lib/components/app/native-select.svelte';
	import EmployeePicker from '#lib/components/app/employee-picker.svelte';
	import {
		COMPARISON_OPERATORS,
		PRIORITIES,
		VACATION_STATUSES,
		type VacationTypeDto
	} from '#lib/api/types.ts';
	import type { EmployeeOption } from '#lib/remote/dictionaries.remote.ts';
	import { priorityLabel, statusLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { todayIso } from '#lib/utils/date.ts';
	import {
		clearFilters,
		countFilters,
		DEFAULT_STATE,
		PRESETS,
		togglePreset,
		type PresetId,
		type VacationUrlState
	} from '#lib/utils/vacation-filters.ts';

	const chip =
		'border-border hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors';

	let {
		filters,
		types,
		employees,
		employeesComplete,
		onchange,
		showSort = true
	}: {
		filters: VacationUrlState;
		types: VacationTypeDto[];
		employees: EmployeeOption[];
		employeesComplete: boolean;
		onchange: (patch: Partial<VacationUrlState>) => void;
		showSort?: boolean;
	} = $props();

	let search = $state('');
	$effect.pre(() => {
		search = filters.search;
	});
	let timer: ReturnType<typeof setTimeout> | undefined;
	function onSearch() {
		clearTimeout(timer);
		timer = setTimeout(() => onchange({ search }), 300);
	}

	const today = todayIso();
	const presets: { id: PresetId; label: () => string }[] = [
		{ id: 'pending', label: m.vac_preset_pending },
		{ id: 'drafts', label: m.vac_preset_drafts },
		{ id: 'urgent', label: m.vac_preset_urgent },
		{ id: 'upcoming', label: m.vac_preset_upcoming },
		{ id: 'archive', label: m.vac_preset_archive }
	];

	const sortOptions = [
		{ value: 'createdAt:DESC', label: m.vac_sort_created() },
		{ value: 'createdAt:ASC', label: m.vac_sort_created_asc() },
		{ value: 'startDate:ASC', label: m.vac_sort_start() },
		{ value: 'startDate:DESC', label: m.vac_sort_start_desc() },
		{ value: 'daysCount:DESC', label: m.vac_sort_days() },
		{ value: 'daysCount:ASC', label: m.vac_sort_days_asc() }
	];
	let sortValue = $derived(`${filters.sort}:${filters.direction}`);

	// Draft of the advanced filters, applied on "Apply".
	let open = $state(false);
	let draft = $state<VacationUrlState>({ ...DEFAULT_STATE });
	$effect(() => {
		if (open) draft = { ...filters };
	});
	let draftDays = $derived(draft.daysCount === undefined ? '' : String(draft.daysCount));
	const filterCount = $derived(countFilters(filters));
</script>

<div class="grid gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<div class="relative min-w-56 flex-1">
			<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
			<Input
				type="search"
				class="pl-9"
				placeholder={m.vac_search()}
				bind:value={search}
				oninput={onSearch}
				aria-label={m.vac_search()}
			/>
		</div>
		<Popover.Root bind:open>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline">
						<SlidersHorizontal />
						{m.vac_filters()}
						{#if filterCount}
							<span class="bg-primary text-primary-foreground grid size-5 place-items-center rounded-full text-xs">
								{filterCount}
							</span>
						{/if}
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[min(92vw,26rem)]" align="end">
				<form
					class="grid gap-3"
					onsubmit={(event) => {
						event.preventDefault();
						onchange({ ...draft, daysCount: draftDays ? Number(draftDays) : undefined });
						open = false;
					}}
				>
					<div class="grid grid-cols-2 gap-3">
						<div class="grid content-start gap-1.5">
							<Label for="f-status">{m.vac_filter_status()}</Label>
							<NativeSelect
								id="f-status"
								bind:value={draft.status}
								placeholder={m.any()}
								options={VACATION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
							/>
						</div>
						<div class="grid content-start gap-1.5">
							<Label for="f-priority">{m.vac_filter_priority()}</Label>
							<NativeSelect
								id="f-priority"
								bind:value={draft.priority}
								placeholder={m.any()}
								options={PRIORITIES.map((p) => ({ value: p, label: priorityLabel(p) }))}
							/>
						</div>
					</div>
					<div class="grid content-start gap-1.5">
						<Label for="f-type">{m.vac_filter_type()}</Label>
						<NativeSelect
							id="f-type"
							bind:value={draft.vacationTypeId}
							placeholder={m.any()}
							options={types.map((t) => ({ value: t.id, label: t.name }))}
						/>
					</div>
					<div class="grid content-start gap-1.5">
						<Label for="f-employee">{m.vac_filter_employee()}</Label>
						<div class="flex gap-1">
							<EmployeePicker
								id="f-employee"
								bind:value={() => draft.employeeId ?? '', (v) => (draft.employeeId = v || undefined)}
								{employees}
								complete={employeesComplete}
								placeholder={m.any()}
							/>
							{#if draft.employeeId}
								<Button variant="ghost" size="icon" aria-label={m.reset_filters()} onclick={() => (draft.employeeId = undefined)}>
									<X />
								</Button>
							{/if}
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div class="grid content-start gap-1.5">
							<Label for="f-from">{m.vac_filter_start()} · {m.date_from()}</Label>
							<Input id="f-from" type="date" bind:value={draft.startDateFrom} />
						</div>
						<div class="grid content-start gap-1.5">
							<Label for="f-to">{m.date_to()}</Label>
							<Input id="f-to" type="date" bind:value={draft.startDateTo} />
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div class="grid content-start gap-1.5">
							<Label for="f-days">{m.vac_filter_days()}</Label>
							<div class="flex gap-1">
								<NativeSelect
									class="w-20"
									bind:value={draft.daysCountOperator}
									options={COMPARISON_OPERATORS.map((op) => ({ value: op, label: m[`op_${op}`]() }))}
									aria-label={m.vac_filter_days()}
								/>
								<Input id="f-days" type="number" min="1" inputmode="numeric" bind:value={draftDays} />
							</div>
						</div>
						<div class="grid content-start gap-1.5">
							<Label for="f-urgent">{m.vac_filter_urgent()}</Label>
							<NativeSelect
								id="f-urgent"
								bind:value={
									() => (draft.urgent === undefined ? '' : String(draft.urgent)),
									(v) => (draft.urgent = v === '' ? undefined : v === 'true')
								}
								placeholder={m.any()}
								options={[
									{ value: 'true', label: m.vac_filter_urgent_only() },
									{ value: 'false', label: m.vac_filter_not_urgent() }
								]}
							/>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div class="grid content-start gap-1.5">
							<Label for="f-tag">{m.vac_filter_tag()}</Label>
							<Input id="f-tag" bind:value={draft.tag} maxlength={100} />
						</div>
						<div class="grid content-start gap-1.5">
							<Label for="f-archived">{m.vac_filter_archived()}</Label>
							<NativeSelect
								id="f-archived"
								bind:value={draft.archived}
								options={[
									{ value: 'hide', label: m.vac_filter_archived_hide() },
									{ value: 'only', label: m.vac_filter_archived_only() },
									{ value: 'all', label: m.vac_filter_archived_all() }
								]}
							/>
						</div>
					</div>
					<div class="flex justify-between gap-2 pt-1">
						<Button
							variant="ghost"
							type="button"
							onclick={() => {
								onchange(clearFilters(filters));
								open = false;
							}}
						>
							{m.reset_filters()}
						</Button>
						<Button type="submit">{m.vac_filter_apply()}</Button>
					</div>
				</form>
			</Popover.Content>
		</Popover.Root>
		{#if showSort}
			<NativeSelect
				class="w-52"
				bind:value={sortValue}
				aria-label={m.vac_sort_label()}
				options={sortOptions}
				onchange={() => {
					const [sort, direction] = sortValue.split(':') as [VacationUrlState['sort'], 'ASC' | 'DESC'];
					onchange({ sort, direction });
				}}
			/>
		{/if}
	</div>
	<div class="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label={m.vac_filters()}>
		<button
			type="button"
			onclick={() => onchange(clearFilters(filters))}
			aria-pressed={countFilters(filters) === 0}
			class={chip}
		>
			{m.vac_preset_all()}
		</button>
		{#each presets as preset (preset.id)}
			<button
				type="button"
				onclick={() => onchange(togglePreset(filters, preset.id, today))}
				aria-pressed={PRESETS[preset.id].isActive(filters, today)}
				class={chip}
			>
				{preset.label()}
				{#if PRESETS[preset.id].isActive(filters, today)}<X class="-mr-1 size-3.5 opacity-70" aria-hidden="true" />{/if}
			</button>
		{/each}
	</div>
</div>
