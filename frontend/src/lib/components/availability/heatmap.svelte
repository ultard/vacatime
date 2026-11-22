<script lang="ts">
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import type { AvailabilityDto } from '#lib/api/types.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { dayLevel, type DayLevel } from '#lib/utils/availability.ts';
	import { eachDay, formatDate, intlLocale, isWeekend, todayIso } from '#lib/utils/date.ts';

	let { data }: { data: AvailabilityDto } = $props();

	const days = $derived(eachDay(data.from, data.to));
	const weekday = $derived(new Intl.DateTimeFormat(intlLocale(), { weekday: 'narrow' }));
	const today = todayIso();
	const CELL = 28;
</script>

<Tooltip.Provider delayDuration={80}>
	<div class="overflow-auto rounded-xl border" role="region" aria-label={m.av_title()}>
		<table class="border-separate border-spacing-0 text-xs">
			<thead class="bg-background/95 sticky top-0 z-10 backdrop-blur">
				<tr>
					<th class="bg-background/95 sticky left-0 z-20 min-w-56 border-b px-3 py-2 text-left font-medium"></th>
					{#each days as day (day)}
						<th
							class="border-b px-0 py-1 text-center font-normal tabular-nums"
							class:text-primary={day === today}
							class:text-muted-foreground={day !== today}
							style:min-width="{CELL}px"
						>
							<span class="block text-[10px] uppercase">{weekday.format(new Date(day))}</span>
							<span class:font-bold={day === today}>{Number(day.slice(8))}</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.departments as department (department.id)}
					<tr>
						<th
							colspan={days.length + 1}
							class="bg-muted/60 sticky left-0 border-b px-3 py-1.5 text-left text-xs font-semibold"
						>
							{department.name}
						</th>
					</tr>
					{#each department.shifts as shift (shift.id)}
						<tr>
							<th class="bg-background sticky left-0 z-10 border-b px-3 py-1 text-left text-sm font-normal">{shift.name}</th>
							{#each shift.days as day (day.date)}
								{@const level = dayLevel(day)}
								<td class="border-b p-0.5" class:bg-muted={isWeekend(day.date)}>
									<Tooltip.Root>
										<Tooltip.Trigger
											class="heat grid h-6 w-full place-items-center rounded-[5px] text-[10px] font-medium tabular-nums"
											data-level={level}
											aria-label="{shift.name}, {formatDate(day.date)}"
										>
											{day.planned ? day.forecastAvailable : ''}
										</Tooltip.Trigger>
										<Tooltip.Content class="grid gap-0.5 text-xs">
											<p class="font-semibold">{department.name} · {shift.name} · {formatDate(day.date)}</p>
											{#if day.planned}
												<p>{m.av_cell_minimum({ count: day.minimumStaff ?? 0 })}</p>
												<p>{m.av_cell_scheduled({ count: day.scheduledStaff ?? 0 })}</p>
												<p>{m.av_cell_approved({ count: day.approvedAbsent ?? 0 })}</p>
												<p>{m.av_cell_pending({ count: day.pendingAbsent ?? 0 })}</p>
												<p class="font-medium">
													{m.av_cell_available({ now: day.availableAfterApproved ?? 0, forecast: day.forecastAvailable ?? 0 })}
												</p>
											{:else}
												<p>{m.av_cell_unplanned()}</p>
											{/if}
										</Tooltip.Content>
									</Tooltip.Root>
								</td>
							{/each}
						</tr>
					{/each}
				{/each}
			</tbody>
		</table>
	</div>
</Tooltip.Provider>

<style>
	:global(.heat[data-level='ok']) {
		background: color-mix(in oklch, var(--status-approved) 28%, transparent);
	}
	:global(.heat[data-level='tight']) {
		background: color-mix(in oklch, var(--status-approved) 12%, transparent);
		outline: 1px solid color-mix(in oklch, var(--status-approved) 45%, transparent);
		outline-offset: -1px;
	}
	:global(.heat[data-level='forecast']) {
		background: color-mix(in oklch, var(--status-pending) 45%, transparent);
	}
	:global(.heat[data-level='confirmed']) {
		background: var(--status-rejected);
		color: white;
	}
	:global(.heat[data-level='unplanned']) {
		background: repeating-linear-gradient(135deg, transparent 0 4px, var(--border) 4px 5px);
	}
</style>
