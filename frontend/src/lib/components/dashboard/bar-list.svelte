<script lang="ts">
	import { formatNumber } from '#lib/utils/date.ts';

	/** Lightweight horizontal bars (CSS only) — animates width on first paint via @starting-style. */
	let { data }: { data: { key: string; label: string; value: number; color: string; href?: string }[] } = $props();
	const max = $derived(Math.max(1, ...data.map((d) => d.value)));
</script>

<ul class="grid gap-3">
	{#each data as item (item.key)}
		<li class="grid gap-1">
			<div class="flex items-center justify-between text-sm">
				{#if item.href}
					<a class="hover:underline" href={item.href}>{item.label}</a>
				{:else}
					<span>{item.label}</span>
				{/if}
				<span class="font-medium tabular-nums">{formatNumber(item.value)}</span>
			</div>
			<div class="bg-muted h-2 overflow-hidden rounded-full">
				<div class="bar h-full rounded-full" style:width="{(item.value / max) * 100}%" style:background={item.color}></div>
			</div>
		</li>
	{/each}
</ul>

<style>
	.bar {
		transition: width 0.9s cubic-bezier(0.2, 0, 0, 1);
		@starting-style {
			width: 0;
		}
	}
</style>
