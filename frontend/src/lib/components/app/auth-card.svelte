<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div
	class="bg-card/75 dark:bg-card/70 w-full max-w-sm rounded-3xl border border-white/40 p-7 shadow-2xl shadow-black/20 backdrop-blur-xl backdrop-saturate-150 motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:p-8 dark:border-white/10"
>
	{@render children()}
</div>
