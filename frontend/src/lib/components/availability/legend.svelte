<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	const items = [
		{ level: 'ok', label: m.av_legend_ok },
		{ level: 'tight', label: m.av_legend_tight },
		{ level: 'forecast', label: m.av_legend_forecast },
		{ level: 'confirmed', label: m.av_legend_confirmed },
		{ level: 'unplanned', label: m.av_legend_unplanned }
	];
</script>

<ul class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-2 text-xs">
	{#each items as item (item.level)}
		<li class="flex items-center gap-1.5">
			<span class="heat inline-block size-3.5 rounded-[4px]" data-level={item.level}></span>
			{item.label()}
		</li>
	{/each}
</ul>
