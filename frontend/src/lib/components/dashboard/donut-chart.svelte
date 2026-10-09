<script lang="ts">
	import { formatNumber } from '#lib/utils/date.ts';

	/** Hand-rolled SVG donut: arcs are dashed circles, so it stays crisp and needs no chart library. */
	let {
		data,
		centerLabel
	}: { data: { key: string; label: string; value: number; color: string }[]; centerLabel: string } = $props();

	const SIZE = 160;
	const STROKE = 22;
	/** A hovered arc grows by this much, so the view box keeps room for it on every side. */
	const HOVER_GROW = 4;
	const RADIUS = (SIZE - STROKE) / 2;
	const PAD = HOVER_GROW / 2 + 1;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
	const GAP = 2;

	let hovered = $state<string | null>(null);
	const total = $derived(data.reduce((sum, d) => sum + d.value, 0));
	const segments = $derived.by(() => {
		let offset = 0;
		const visible = data.filter((d) => d.value > 0);
		return visible.map((d) => {
			const length = total ? (d.value / total) * CIRCUMFERENCE : 0;
			const segment = {
				...d,
				dash: Math.max(0, length - (visible.length > 1 ? GAP : 0)),
				offset,
				share: total ? Math.round((d.value / total) * 100) : 0
			};
			offset += length;
			return segment;
		});
	});
	const active = $derived(segments.find((s) => s.key === hovered));
</script>

<!-- Legend sits beside the donut only when the card is wide enough, otherwise below it. -->
<div class="@container">
<div class="grid items-center gap-5 @sm:grid-cols-[auto_minmax(0,1fr)]">
	<svg
		viewBox="{-PAD} {-PAD} {SIZE + PAD * 2} {SIZE + PAD * 2}"
		class="mx-auto size-40 shrink-0"
		role="img"
		aria-label="{centerLabel}: {formatNumber(total)}"
	>
		<circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--muted)" stroke-width={STROKE} />
		<g transform="rotate(-90 {SIZE / 2} {SIZE / 2})">
			{#each segments as segment (segment.key)}
				<circle
					class="segment"
					cx={SIZE / 2}
					cy={SIZE / 2}
					r={RADIUS}
					fill="none"
					stroke={segment.color}
					stroke-width={hovered === segment.key ? STROKE + HOVER_GROW : STROKE}
					stroke-dasharray="{segment.dash} {CIRCUMFERENCE}"
					stroke-dashoffset={-segment.offset}
					opacity={hovered && hovered !== segment.key ? 0.35 : 1}
					role="presentation"
					onpointerenter={() => (hovered = segment.key)}
					onpointerleave={() => (hovered = null)}
				/>
			{/each}
		</g>
		<text x={SIZE / 2} y={SIZE * 0.47} text-anchor="middle" dominant-baseline="middle" class="fill-foreground text-[28px] font-semibold tabular-nums">
			{formatNumber(active ? active.value : total)}
		</text>
		<text x={SIZE / 2} y={SIZE * 0.64} text-anchor="middle" dominant-baseline="middle" class="fill-muted-foreground text-[11px]">
			{active ? `${active.label} · ${active.share}%` : centerLabel}
		</text>
	</svg>
	<ul class="grid gap-1.5 text-sm">
		{#each data as item (item.key)}
			<li>
				<button
					type="button"
					class="hover:bg-muted flex w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left transition-opacity"
					class:opacity-40={hovered && hovered !== item.key}
					onpointerenter={() => (hovered = item.key)}
					onpointerleave={() => (hovered = null)}
					onfocus={() => (hovered = item.key)}
					onblur={() => (hovered = null)}
				>
					<span class="size-2.5 shrink-0 rounded-sm" style:background={item.color}></span>
					<span class="text-muted-foreground min-w-0">{item.label}</span>
					<span class="ml-auto pl-3 font-medium tabular-nums">{formatNumber(item.value)}</span>
				</button>
			</li>
		{/each}
	</ul>
</div>
</div>

<style>
	.segment {
		transition:
			stroke-width 0.2s ease,
			opacity 0.2s ease;
		@starting-style {
			stroke-dasharray: 0 999;
		}
	}
	@media (prefers-reduced-motion: no-preference) {
		.segment {
			transition:
				stroke-dasharray 0.9s cubic-bezier(0.2, 0, 0, 1),
				stroke-width 0.2s ease,
				opacity 0.2s ease;
		}
	}
</style>
