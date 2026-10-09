<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Info from '@lucide/svelte/icons/info';
	import Copy from '@lucide/svelte/icons/copy';
	import CopyCheck from '@lucide/svelte/icons/copy-check';
	import Eraser from '@lucide/svelte/icons/eraser';
	import Wand from '@lucide/svelte/icons/wand-sparkles';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import EmptyState from '#lib/components/app/empty-state.svelte';
	import ConfirmDialog from '#lib/components/app/confirm-dialog.svelte';
	import PlanCell from '#lib/components/shift-plan/plan-cell.svelte';
	import { listDepartments, listEmployees } from '#lib/remote/dictionaries.remote.ts';
	import { getAvailability } from '#lib/remote/analytics.remote.ts';
	import { replaceShiftPlan } from '#lib/remote/admin.remote.ts';
	import type { AvailabilityDto } from '#lib/api/types.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { addDays, diffDays, eachDay, formatDate, intlLocale, todayIso } from '#lib/utils/date.ts';
	import { errorMessage } from '#lib/utils/errors.ts';
	import {
		applyTemplate,
		buildRequest,
		copyDay,
		emptyDraft,
		GRID_MAX_DAYS,
		MAX_PLAN_DAYS,
		parseDraft,
		validatePlan,
		weekdayIndex,
		type CellPlan,
		type PlanDraft
	} from '#lib/utils/shift-plan.ts';

	const STORAGE_KEY = 'vt_shift_plan_draft';
	const today = todayIso();

	let draft = $state<PlanDraft>(emptyDraft(today, addDays(today, 13)));
	let restored = false;
	$effect(() => {
		if (restored) return;
		restored = true;
		const saved = parseDraft(localStorage.getItem(STORAGE_KEY));
		if (saved && saved.from >= today) {
			draft = saved;
			toast.info(m.sp_draft_restored());
		}
	});
	$effect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
	});

	const departments = listDepartments();
	const employees = listEmployees();
	const days = $derived(eachDay(draft.from, draft.to));
	const length = $derived(days.length);
	const issues = $derived(validatePlan(draft, today));
	let tab = $state<'grid' | 'template'>('grid');
	let confirmOpen = $state(false);

	const weekdays = $derived.by(() => {
		const format = new Intl.DateTimeFormat(intlLocale(), { weekday: 'short' });
		return Array.from({ length: 7 }, (_, i) => format.format(new Date(2026, 9, 5 + i)));
	});

	function setRange(from: string, to: string) {
		if (!from || !to) return;
		const start = from < today ? today : from;
		let end = to < start ? start : to;
		if (diffDays(start, end) + 1 > MAX_PLAN_DAYS) end = addDays(start, MAX_PLAN_DAYS - 1);
		draft = { ...draft, from: start, to: end };
		if (diffDays(start, end) + 1 > GRID_MAX_DAYS) tab = 'template';
	}

	function setCell(date: string, shiftId: string, cell: CellPlan | undefined) {
		const day = { ...(draft.days[date] ?? {}) };
		if (cell) day[shiftId] = cell;
		else delete day[shiftId];
		draft = { ...draft, days: { ...draft.days, [date]: day } };
	}

	function setTemplateCell(weekday: number, shiftId: string, cell: CellPlan | undefined) {
		const day = { ...(draft.template[weekday] ?? {}) };
		if (cell) day[shiftId] = cell;
		else delete day[shiftId];
		draft = { ...draft, template: { ...draft.template, [weekday]: day } };
	}

	/** Employees already assigned to another shift on this date (shown greyed in the picker). */
	function busyOn(date: string, shiftId: string): Set<string> {
		return new Set(
			Object.entries(draft.days[date] ?? {})
				.filter(([id]) => id !== shiftId)
				.flatMap(([, cell]) => cell.employeeIds)
		);
	}

	function prefill(data: AvailabilityDto) {
		let count = 0;
		const next = { ...draft.days };
		for (const department of data.departments) {
			for (const shift of department.shifts) {
				for (const day of shift.days) {
					if (!day.planned || day.minimumStaff === null) continue;
					const existing = next[day.date]?.[shift.id];
					next[day.date] = {
						...(next[day.date] ?? {}),
						[shift.id]: { minimumStaff: day.minimumStaff, employeeIds: existing?.employeeIds ?? [] }
					};
					count++;
				}
			}
		}
		draft = { ...draft, days: next };
		toast.success(m.sp_prefilled({ count }));
	}

	async function save(activeShiftIds: Set<string>) {
		try {
			await replaceShiftPlan(buildRequest(draft, activeShiftIds));
			toast.success(m.sp_saved());
			localStorage.removeItem(STORAGE_KEY);
			void getAvailability({ from: draft.from, to: draft.to > addDays(draft.from, 365) ? addDays(draft.from, 365) : draft.to }).refresh();
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}

	const planned = $derived(days.reduce((sum, d) => sum + Object.keys(draft.days[d] ?? {}).length, 0));
	const assignments = $derived(
		days.reduce((sum, d) => sum + Object.values(draft.days[d] ?? {}).reduce((s, c) => s + c.employeeIds.length, 0), 0)
	);
	const emptyDays = $derived(days.filter((d) => Object.keys(draft.days[d] ?? {}).length === 0).length);
</script>

<svelte:head><title>{m.sp_title()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-6 py-6">
	<header class="grid gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{m.sp_title()}</h1>
		<p class="text-muted-foreground text-sm">{m.sp_subtitle()}</p>
	</header>

	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-96 w-full" />{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		{@const allDepartments = await departments}
		{@const people = (await employees).employees}
		{@const shifts = allDepartments.flatMap((d) => d.shifts.filter((s) => s.active).map((s) => ({ ...s, department: d.name })))}
		{@const activeShiftIds = new Set(shifts.map((s) => s.id))}

		{#if shifts.length === 0}
			<EmptyState icon={CalendarClock} title={m.sp_no_shifts()} />
		{:else}
			<!-- Step 1 -->
			<section class="bg-card grid gap-4 rounded-2xl border p-5">
				<h2 class="font-semibold">{m.sp_step_range()}</h2>
				<div class="flex flex-wrap items-end gap-3">
					<div class="grid gap-1.5">
						<Label for="sp-from">{m.date_from()}</Label>
						<Input id="sp-from" type="date" min={today} value={draft.from} class="w-40" onchange={(e) => setRange(e.currentTarget.value, draft.to)} />
					</div>
					<div class="grid gap-1.5">
						<Label for="sp-to">{m.date_to()}</Label>
						<Input id="sp-to" type="date" min={draft.from} max={addDays(draft.from, MAX_PLAN_DAYS - 1)} value={draft.to} class="w-40" onchange={(e) => setRange(draft.from, e.currentTarget.value)} />
					</div>
					<span class="text-muted-foreground pb-2 text-sm tabular-nums">{m.days_long({ count: length })}</span>
					<Button variant="ghost" size="sm" class="ml-auto" onclick={() => (draft = emptyDraft(today, addDays(today, 13)))}>
						<Eraser />{m.sp_reset_draft()}
					</Button>
				</div>
				<p class="text-muted-foreground text-xs">{m.sp_range_hint()}</p>
				<div class="bg-muted/60 flex flex-wrap items-center gap-3 rounded-lg p-3 text-sm">
					<Info class="text-muted-foreground size-4 shrink-0" />
					<span class="text-muted-foreground flex-1">{m.sp_no_api_get()}</span>
					<Button
						size="sm"
						variant="outline"
						onclick={async () => prefill(await getAvailability({ from: draft.from, to: draft.to > addDays(draft.from, 365) ? addDays(draft.from, 365) : draft.to }))}
					>
						<Wand />{m.sp_prefill()}
					</Button>
				</div>
			</section>

			<!-- Step 2 -->
			<section class="bg-card grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 rounded-2xl border p-5">
				<h2 class="font-semibold">{m.sp_step_plan()}</h2>
				<Tabs.Root bind:value={tab} class="min-w-0">
					<Tabs.List>
						<Tabs.Trigger value="grid" disabled={length > GRID_MAX_DAYS}>{m.sp_grid()}</Tabs.Trigger>
						<Tabs.Trigger value="template">{m.sp_template()}</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="grid" class="pt-3">
						{#if length > GRID_MAX_DAYS}
							<p class="text-muted-foreground text-sm">{m.sp_grid_too_long()}</p>
						{:else}
							<div class="overflow-x-auto">
								<table class="border-separate border-spacing-1 text-sm">
									<thead>
										<tr>
											<th class="bg-card sticky left-0 z-10 min-w-48"></th>
											{#each days as date (date)}
												<th class="min-w-20 align-bottom font-normal">
													<div class="grid justify-items-center gap-1 pb-1">
														<span class="text-muted-foreground text-xs capitalize">{formatDate(date, { weekday: 'short' })}</span>
														<span class="font-medium tabular-nums">{formatDate(date, { day: 'numeric', month: 'short' })}</span>
														<span class="flex">
															<Button size="icon" variant="ghost" class="size-6" title={m.sp_copy_next()} aria-label={m.sp_copy_next()} disabled={date === draft.to} onclick={() => (draft = { ...draft, days: copyDay(draft.days, date, [addDays(date, 1)]) })}>
																<Copy class="size-3" />
															</Button>
															<Button size="icon" variant="ghost" class="size-6" title={m.sp_copy_weekdays()} aria-label={m.sp_copy_weekdays()} onclick={() => (draft = { ...draft, days: copyDay(draft.days, date, days.filter((d) => weekdayIndex(d) === weekdayIndex(date))) })}>
																<CopyCheck class="size-3" />
															</Button>
															<Button size="icon" variant="ghost" class="size-6" title={m.sp_clear_day()} aria-label={m.sp_clear_day()} onclick={() => (draft = { ...draft, days: { ...draft.days, [date]: {} } })}>
																<Eraser class="size-3" />
															</Button>
														</span>
													</div>
												</th>
											{/each}
										</tr>
									</thead>
									<tbody>
										{#each shifts as shift (shift.id)}
											<tr>
												<th class="bg-card sticky left-0 z-10 pr-3 text-left font-normal">
													<span class="grid">
														<span class="font-medium">{shift.name}</span>
														<span class="text-muted-foreground text-xs">{shift.department}</span>
													</span>
												</th>
												{#each days as date (date)}
													<td>
														<PlanCell
															cell={draft.days[date]?.[shift.id]}
															employees={people}
															busy={busyOn(date, shift.id)}
															label="{shift.department} · {shift.name} · {formatDate(date)}"
															invalid={issues.some((i) => i.date === date && i.shiftIds.includes(shift.id))}
															onchange={(cell) => setCell(date, shift.id, cell)}
														/>
													</td>
												{/each}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</Tabs.Content>
					<Tabs.Content value="template" class="grid gap-3 pt-3">
						<div class="overflow-x-auto">
							<table class="border-separate border-spacing-1 text-sm">
								<thead>
									<tr>
										<th class="min-w-48"></th>
										{#each weekdays as weekday, i (i)}
											<th class="text-muted-foreground min-w-20 pb-1 text-xs font-normal capitalize">{weekday}</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each shifts as shift (shift.id)}
										<tr>
											<th class="pr-3 text-left font-normal">
												<span class="grid">
													<span class="font-medium">{shift.name}</span>
													<span class="text-muted-foreground text-xs">{shift.department}</span>
												</span>
											</th>
											{#each weekdays as weekday, i (i)}
												<td>
													<PlanCell
														cell={draft.template[i]?.[shift.id]}
														employees={people}
														busy={new Set()}
														label="{shift.department} · {shift.name} · {weekday}"
														onchange={(cell) => setTemplateCell(i, shift.id, cell)}
													/>
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<Button
							class="w-fit"
							variant="outline"
							onclick={() => {
								draft = { ...draft, days: applyTemplate(draft) };
								toast.success(m.sp_template_applied());
							}}
						>
							<Wand />{m.sp_template_apply()}
						</Button>
					</Tabs.Content>
				</Tabs.Root>
			</section>

			<!-- Step 3 -->
			<section class="bg-card grid gap-4 rounded-2xl border p-5">
				<h2 class="font-semibold">{m.sp_step_review()}</h2>
				<ul class="grid gap-1 text-sm sm:grid-cols-2">
					<li>{m.sp_review_days({ count: length })}</li>
					<li>{m.sp_review_cells({ count: planned })}</li>
					<li>{m.sp_review_assignments({ count: assignments })}</li>
					<li class={emptyDays > 0 ? 'text-amber-700 dark:text-amber-300' : ''}>{m.sp_review_empty({ count: emptyDays })}</li>
				</ul>
				{#if issues.length}
					<ul class="bg-destructive/10 text-destructive grid gap-1 rounded-lg p-3 text-sm">
						{#each issues.slice(0, 8) as issue, i (i)}
							<li class="flex items-center gap-2">
								<TriangleAlert class="size-4" />
								{issue.kind === 'past-date' ? m.sp_issue_past({ date: formatDate(issue.date) }) : m.sp_issue_twice({ date: formatDate(issue.date) })}
							</li>
						{/each}
					</ul>
				{/if}
				<Button
					variant="destructive"
					class="w-fit"
					disabled={issues.length > 0 || replaceShiftPlan.pending > 0}
					title={issues.length ? m.sp_fix_issues() : undefined}
					onclick={() => (confirmOpen = true)}
				>
					{#if replaceShiftPlan.pending}<Spinner />{/if}
					{m.sp_save()}
				</Button>
			</section>

			<ConfirmDialog
				bind:open={confirmOpen}
				title={m.sp_confirm_title()}
				description={m.sp_confirm_desc({ count: length, from: formatDate(draft.from), to: formatDate(draft.to) })}
				confirmLabel={m.sp_save()}
				destructive
				onconfirm={() => save(activeShiftIds)}
			/>
		{/if}
	</svelte:boundary>
</div>
