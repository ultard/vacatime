<script lang="ts">
	import ThemeToggle from '#lib/components/app/theme-toggle.svelte';
	import LocaleToggle from '#lib/components/app/locale-toggle.svelte';

	let { children } = $props();
</script>

<div class="fixed top-4 right-4 z-20 flex gap-1 rounded-full bg-black/20 p-1 text-white backdrop-blur-md">
	<LocaleToggle />
	<ThemeToggle />
</div>
{@render children()}
