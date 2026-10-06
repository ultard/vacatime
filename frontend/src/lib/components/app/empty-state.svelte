<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import TreePalm from '@lucide/svelte/icons/tree-palm';

	let {
		title,
		description,
		icon: Icon = TreePalm,
		children
	}: { title: string; description?: string; icon?: Component; children?: Snippet } = $props();
</script>

<div class="grid justify-items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
	<div class="bg-muted grid size-12 place-items-center rounded-full">
		<Icon class="text-muted-foreground size-6" />
	</div>
	<p class="font-medium">{title}</p>
	{#if description}<p class="text-muted-foreground max-w-sm text-sm">{description}</p>{/if}
	{@render children?.()}
</div>
