<script lang="ts">
	import { onMount } from 'svelte';
	import { mode } from 'mode-watcher';
	import { prefersReducedMotion } from 'svelte/motion';
	import Fallback from './fallback.svelte';
	import ShiftPuzzle from './shift-puzzle.svelte';
	import type { Mood } from './types.ts';

	let { mood = 'idle' }: { mood?: Mood } = $props();

	// The canvas only runs in the browser; SSR renders the static backdrop.
	let mounted = $state(false);
	let failed = $state(false);
	onMount(() => (mounted = true));

	const dark = $derived(mode.current === 'dark');
</script>

<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
	<Fallback {dark} />
	{#if mounted && !failed}
		<div class="absolute inset-0 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
			<ShiftPuzzle {mood} {dark} reducedMotion={prefersReducedMotion.current} onfail={() => (failed = true)} />
		</div>
	{/if}
</div>
