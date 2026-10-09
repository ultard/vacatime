<script lang="ts">
	import Layers from '@lucide/svelte/icons/layers';
	import TreePalm from '@lucide/svelte/icons/tree-palm';
	import Archive from '@lucide/svelte/icons/archive';
	import Flame from '@lucide/svelte/icons/flame';
	import Timer from '@lucide/svelte/icons/timer';
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import StatusBadge from '#lib/components/app/status-badge.svelte';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import KpiCard from '#lib/components/dashboard/kpi-card.svelte';
	import DonutChart from '#lib/components/dashboard/donut-chart.svelte';
	import BarList from '#lib/components/dashboard/bar-list.svelte';
	import ShortageWidget from '#lib/components/dashboard/shortage-widget.svelte';
	import { ACTIVE_STATUSES, PRIORITIES, VACATION_STATUSES } from '#lib/api/types.ts';
	import { getSummary } from '#lib/remote/analytics.remote.ts';
	import { listVacations } from '#lib/remote/vacations.remote.ts';
	import { getUser } from '#lib/context.ts';
	import { priorityLabel, statusLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { diffDays, formatDate, formatRange, todayIso } from '#lib/utils/date.ts';

	const user = getUser();
	const today = todayIso();
	const hour = new Date().getHours();
	const greeting = $derived(
		(hour < 12 ? m.dash_greeting_morning : hour < 18 ? m.dash_greeting_day : m.dash_greeting_evening)({
			name: user().fullName.split(' ')[0]
		})
	);
	const PRIORITY_COLORS = { LOW: 'var(--chart-1)', NORMAL: 'var(--chart-4)', HIGH: 'var(--chart-2)' };
	const TYPE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
</script>

<svelte:head><title>{m.nav_overview()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-6 py-6">
	<header class="grid gap-1">
		<h1 class="text-3xl font-semibold tracking-tight">{greeting}</h1>
		<p class="text-muted-foreground first-letter:uppercase">
			{m.dash_today({ date: formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' }) })}
		</p>
	</header>

	<svelte:boundary>
		{#snippet pending()}
			<div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{#each Array(6) as _, i (i)}<Skeleton class="h-24" />{/each}</div>
		{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		{@const summary = await getSummary()}
		{@const pendingPage = await listVacations({ status: 'PENDING', archived: false, size: 1 })}
		<section class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
			<KpiCard label={m.dash_kpi_total()} value={summary.totalCount} icon={Layers} href="/vacations?archived=all" />
			<KpiCard label={m.dash_kpi_active()} value={summary.activeCount} icon={TreePalm} href="/vacations" />
			<KpiCard label={m.dash_pending()} value={pendingPage.totalElements} icon={Hourglass} href="/vacations?status=PENDING" />
			<KpiCard label={m.dash_kpi_urgent()} value={summary.urgentCount} icon={Flame} href="/vacations?urgent=true&archived=all" />
			<KpiCard label={m.dash_kpi_archived()} value={summary.archivedCount} icon={Archive} href="/vacations?archived=only" />
			<KpiCard
				label={m.dash_kpi_avg()}
				value={summary.averageDaysCount}
				digits={1}
				suffix=" {m.dash_kpi_avg_value({ days: '' }).trim()}"
				icon={Timer}
			/>
		</section>

		<section class="grid gap-4 lg:grid-cols-3">
			<div class="reveal bg-card rounded-2xl border p-5 lg:col-span-1">
				<h2 class="mb-4 font-semibold">{m.dash_by_status()}</h2>
				<DonutChart
					centerLabel={m.dash_all()}
					data={VACATION_STATUSES.map((s) => ({
						key: s,
						label: statusLabel(s),
						value: summary.byStatus[s] ?? 0,
						color: `var(--status-${s.toLowerCase()})`
					}))}
				/>
			</div>
			<div class="reveal bg-card rounded-2xl border p-5">
				<h2 class="mb-4 font-semibold">{m.dash_by_type()}</h2>
				<BarList
					data={Object.entries(summary.byVacationType)
						.sort((a, b) => b[1] - a[1])
						.map(([name, value], i) => ({ key: name, label: name, value, color: TYPE_COLORS[i % TYPE_COLORS.length] }))}
				/>
			</div>
			<div class="reveal bg-card rounded-2xl border p-5">
				<h2 class="mb-4 font-semibold">{m.dash_by_priority()}</h2>
				<BarList
					data={PRIORITIES.map((p) => ({
						key: p,
						label: priorityLabel(p),
						value: summary.byPriority[p] ?? 0,
						color: PRIORITY_COLORS[p],
						href: `/vacations?priority=${p}`
					}))}
				/>
			</div>
		</section>
		<p class="text-muted-foreground -mt-2 text-xs">{m.dash_summary_note()}</p>
	</svelte:boundary>

	<section class="grid gap-4 lg:grid-cols-2">
		<div class="reveal bg-card rounded-2xl border p-5">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-semibold">{m.dash_upcoming()}</h2>
				<Button variant="ghost" size="sm" href="/vacations?from={today}&sort=startDate&dir=ASC">
					{m.dash_pending_cta()}<ArrowRight />
				</Button>
			</div>
			<svelte:boundary>
				{#snippet pending()}<Skeleton class="h-48" />{/snippet}
				{#snippet failed(error, reset)}<ErrorState {error} {reset} compact />{/snippet}
				{@const upcomingPage = await listVacations({ startDateFrom: today, archived: false, sort: 'startDate', direction: 'ASC', size: 20 })}
				{@const upcoming = { content: upcomingPage.content.filter((v) => ACTIVE_STATUSES.includes(v.status)).slice(0, 6) }}
				{#if upcoming.content.length === 0}
					<p class="text-muted-foreground text-sm">{m.dash_upcoming_empty()}</p>
				{/if}
				<ul class="grid gap-1">
					{#each upcoming.content as vacation (vacation.id)}
						{@const inDays = diffDays(today, vacation.startDate)}
						<li>
							<a href="/vacations/{vacation.id}" class="hover:bg-muted flex items-center gap-3 rounded-lg p-2">
								<UserAvatar name={vacation.employee.fullName} class="size-8" />
								<span class="grid min-w-0 flex-1">
									<span class="truncate text-sm font-medium">{vacation.employee.fullName}</span>
									<span class="text-muted-foreground truncate text-xs tabular-nums">
										{formatRange(vacation.startDate, vacation.endDate)} · {inDays === 0 ? m.dash_now() : m.dash_in_days({ count: inDays })}
									</span>
								</span>
								<StatusBadge status={vacation.status} />
							</a>
						</li>
					{/each}
				</ul>
			</svelte:boundary>
		</div>
		<div class="reveal bg-card rounded-2xl border p-5">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-semibold">{m.dash_shortage()}</h2>
				<Button variant="ghost" size="sm" href="/availability">{m.nav_availability()}<ArrowRight /></Button>
			</div>
			<svelte:boundary>
				{#snippet pending()}<Skeleton class="h-48" />{/snippet}
				{#snippet failed(error, reset)}<ErrorState {error} {reset} compact />{/snippet}
				<ShortageWidget />
			</svelte:boundary>
		</div>
	</section>
</div>
