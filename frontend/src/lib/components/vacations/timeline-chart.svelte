<script lang="ts">
	import type { VacationDto } from '#lib/api/types.ts';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import { statusLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { diffDays, eachDay, formatRange, intlLocale, isWeekend, todayIso } from '#lib/utils/date.ts';
	import { DAY_WIDTH, layoutTimeline, monthSegments, type TimelineWindow, type Zoom } from '#lib/utils/timeline.ts';

	let {
		vacations,
		window,
		zoom,
		onopen,
		onzoom
	}: {
		vacations: VacationDto[];
		window: TimelineWindow;
		zoom: Zoom;
		onopen: (vacation: VacationDto) => void;
		onzoom: (direction: -1 | 1) => void;
	} = $props();

	const LANE_HEIGHT = 30;
	const ROW_PADDING = 10;
	const NAME_WIDTH = 220;

	const dayWidth = $derived(DAY_WIDTH[zoom]);
	const rows = $derived(layoutTimeline(vacations, window));
	const days = $derived(eachDay(window.from, window.to));
	const months = $derived(monthSegments(window));
	const today = todayIso();
	const todayOffset = $derived(today >= window.from && today <= window.to ? diffDays(window.from, today) : -1);

	// Row geometry (rows can have several lanes) + windowed rendering.
	const geometry = $derived.by(() => {
		let top = 0;
		return rows.map((row) => {
			const height = row.lanes * LANE_HEIGHT + ROW_PADDING;
			const g = { row, top, height };
			top += height;
			return g;
		});
	});
	const totalHeight = $derived(geometry.at(-1) ? geometry.at(-1)!.top + geometry.at(-1)!.height : 0);

	let scroller = $state<HTMLDivElement>();
	let scrollTop = $state(0);
	let viewport = $state(600);
	const visible = $derived(geometry.filter((g) => g.top + g.height >= scrollTop - 200 && g.top <= scrollTop + viewport + 200));

	const monthFormat = $derived(
		new Intl.DateTimeFormat(intlLocale(), { month: zoom === 'year' ? 'short' : 'long', year: zoom === 'year' ? undefined : 'numeric' })
	);

	function onwheel(event: WheelEvent) {
		if (!(event.ctrlKey || event.metaKey)) return;
		event.preventDefault();
		onzoom(event.deltaY > 0 ? 1 : -1);
	}

	$effect(() => {
		// Scroll today into view when the window changes.
		if (scroller && todayOffset >= 0) {
			scroller.scrollLeft = Math.max(0, todayOffset * dayWidth - scroller.clientWidth / 3);
		}
	});
</script>

<div
	bind:this={scroller}
	bind:clientHeight={viewport}
	onscroll={() => (scrollTop = scroller!.scrollTop)}
	{onwheel}
	class="relative max-h-[calc(100dvh-16rem)] min-h-80 overflow-auto rounded-xl border"
	role="region"
	aria-label={m.tl_title()}
>
	<div class="relative" style:width="{NAME_WIDTH + days.length * dayWidth}px">
		<!-- Header -->
		<div class="bg-background/95 sticky top-0 z-20 flex border-b backdrop-blur" style:height="52px">
			<div class="bg-background/95 sticky left-0 z-30 shrink-0 border-r px-3 py-2 text-xs font-medium" style:width="{NAME_WIDTH}px">
				{m.tl_employees({ count: rows.length })}
			</div>
			<div class="relative grow">
				{#each months as month (month.offset)}
					<div
						class="absolute top-0 h-6 truncate border-l px-2 pt-1 text-xs font-medium capitalize"
						style:left="{month.offset * dayWidth}px"
						style:width="{month.span * dayWidth}px"
					>
						{monthFormat.format(month.label)}
					</div>
				{/each}
				{#if zoom !== 'year'}
					{#each days as day, i (day)}
						<div
							class="text-muted-foreground absolute top-6 h-6 pt-1 text-center text-[10px] tabular-nums"
							class:font-bold={day === today}
							class:text-primary={day === today}
							style:left="{i * dayWidth}px"
							style:width="{dayWidth}px"
						>
							{zoom === 'month' || Number(day.slice(8)) % 5 === 1 ? Number(day.slice(8)) : ''}
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Body -->
		<div class="relative" style:height="{totalHeight}px">
			<!-- weekends + today -->
			<div class="pointer-events-none absolute inset-y-0" style:left="{NAME_WIDTH}px" style:right="0">
				{#if zoom !== 'year'}
					{#each days as day, i (day)}
						{#if isWeekend(day)}
							<div class="bg-muted/50 absolute inset-y-0" style:left="{i * dayWidth}px" style:width="{dayWidth}px"></div>
						{/if}
					{/each}
				{/if}
				{#each months as month (month.offset)}
					<div class="border-border/60 absolute inset-y-0 border-l" style:left="{month.offset * dayWidth}px"></div>
				{/each}
				{#if todayOffset >= 0}
					<div class="bg-sunset absolute inset-y-0 z-10 w-0.5" style:left="{(todayOffset + 0.5) * dayWidth}px"></div>
				{/if}
			</div>

			{#each visible as { row, top, height } (row.employeeId)}
				<div class="absolute inset-x-0 flex border-b" style:top="{top}px" style:height="{height}px">
					<div
						class="bg-background sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r px-3 text-sm"
						style:width="{NAME_WIDTH}px"
					>
						<UserAvatar name={row.fullName} class="size-6 text-[10px]" />
						<span class="truncate">{row.fullName}</span>
					</div>
					<div class="relative grow">
						{#each row.bars as bar (bar.vacation.id)}
							{@const v = bar.vacation}
							<button
								type="button"
								onclick={() => onopen(v)}
								title="{v.title} · {formatRange(v.startDate, v.endDate)} · {statusLabel(v.status)}"
								class="vt-bar absolute flex items-center overflow-hidden rounded-md px-1.5 text-left text-[11px] font-medium text-white shadow-sm transition-[filter,translate] hover:-translate-y-px hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-1"
								class:rounded-l-none={bar.clippedStart}
								class:rounded-r-none={bar.clippedEnd}
								data-muted={v.archived || v.status === 'CANCELLED' || v.status === 'REJECTED' ? '' : undefined}
								data-status={v.status}
								style:left="{Math.max(bar.offset, 0) * dayWidth + 1}px"
								style:width="{Math.max((bar.span - Math.max(-bar.offset, 0)) * dayWidth - 2, 4)}px"
								style:top="{ROW_PADDING / 2 + bar.lane * LANE_HEIGHT}px"
								style:height="{LANE_HEIGHT - 6}px"
								style:--bar="var(--status-{v.status.toLowerCase()})"
							>
								{#if (bar.span * dayWidth) > 40}<span class="truncate">{v.title}</span>{/if}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.vt-bar {
		/* Darkened so white labels keep a 4.5:1 contrast. */
		background: color-mix(in oklch, var(--bar) 78%, black);
	}
	/* Dark theme: status colours are light, so labels switch to dark text. */
	:global(.dark) .vt-bar {
		background: var(--bar);
		color: oklch(0.2 0.03 252);
	}
	.vt-bar[data-status='PENDING'] {
		background: repeating-linear-gradient(
			135deg,
			var(--bar) 0 6px,
			color-mix(in oklch, var(--bar) 75%, white) 6px 12px
		);
		color: oklch(0.25 0.05 80);
	}
	/* Rejected / cancelled / archived: pale fill but full-contrast text. */
	.vt-bar[data-muted] {
		background: color-mix(in oklch, var(--bar) 25%, var(--background));
		color: var(--foreground);
	}
	.vt-bar[data-status='DRAFT'] {
		background: color-mix(in oklch, var(--bar) 30%, var(--background));
		color: var(--foreground);
		outline: 1px dashed var(--bar);
		outline-offset: -1px;
	}
</style>
