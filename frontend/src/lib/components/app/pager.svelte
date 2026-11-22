<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import NativeSelect from './native-select.svelte';

	let {
		page,
		totalPages,
		size,
		sizes = [20, 50, 100],
		onpage,
		onsize
	}: {
		page: number;
		totalPages: number;
		size: number;
		sizes?: number[];
		onpage: (page: number) => void;
		onsize?: (size: number) => void;
	} = $props();

	let sizeValue = $derived(String(size));
</script>

<nav class="flex flex-wrap items-center justify-end gap-3 text-sm" aria-label="pagination">
	{#if onsize}
		<label class="text-muted-foreground flex items-center gap-2">
			{m.page_size()}
			<NativeSelect
				class="w-20"
				bind:value={sizeValue}
				options={sizes.map((s) => ({ value: String(s), label: String(s) }))}
				onchange={() => onsize(Number(sizeValue))}
			/>
		</label>
	{/if}
	<span class="text-muted-foreground tabular-nums">{m.page_of({ page: page + 1, total: Math.max(totalPages, 1) })}</span>
	<div class="flex gap-1">
		<Button variant="outline" size="icon" aria-label={m.page_prev()} disabled={page <= 0} onclick={() => onpage(page - 1)}>
			<ChevronLeft />
		</Button>
		<Button
			variant="outline"
			size="icon"
			aria-label={m.page_next()}
			disabled={page + 1 >= totalPages}
			onclick={() => onpage(page + 1)}
		>
			<ChevronRight />
		</Button>
	</div>
</nav>
