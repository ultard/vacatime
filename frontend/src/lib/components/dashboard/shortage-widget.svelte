<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import { getAvailability } from '#lib/remote/analytics.remote.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { addDays, todayIso } from '#lib/utils/date.ts';
	import { summarizeShortages } from '#lib/utils/availability.ts';

	const from = todayIso();
	const to = addDays(from, 13);
	const data = await getAvailability({ from, to });
	const rows = summarizeShortages(data);
</script>

{#if rows.length === 0}
	<p class="text-muted-foreground flex items-center gap-2 text-sm">
		<CircleCheck class="size-4 text-[var(--status-approved)]" />{m.dash_shortage_none()}
	</p>
{:else}
	<ul class="grid gap-2 text-sm">
		{#each rows as row (row.shiftId)}
			<li class="flex items-center gap-2">
				<a class="truncate hover:underline" href="/availability?from={from}&to={to}&department={row.departmentId}">
					{row.departmentName} · {row.shiftName}
				</a>
				<span class="ml-auto flex shrink-0 gap-1.5 text-xs tabular-nums">
					{#if row.confirmed}
						<span class="bg-destructive/10 text-destructive rounded px-1.5 py-0.5">{row.confirmed} {m.dash_shortage_confirmed()}</span>
					{/if}
					{#if row.forecast > row.confirmed}
						<span class="rounded bg-[color-mix(in_oklch,var(--status-pending)_20%,transparent)] px-1.5 py-0.5">
							{row.forecast - row.confirmed} {m.dash_shortage_forecast()}
						</span>
					{/if}
				</span>
			</li>
		{/each}
	</ul>
{/if}
