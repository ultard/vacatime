<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import { m } from '#lib/paraglide/messages.js';

	let { id, label }: { id: string; label?: string } = $props();
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(id);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<button
	type="button"
	onclick={copy}
	class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-mono text-xs transition-colors"
	title={copied ? m.copied() : m.copy()}
>
	{label ?? m.error_correlation({ id })}
	{#if copied}<Check class="size-3.5" />{:else}<Copy class="size-3.5" />{/if}
</button>
