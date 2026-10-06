<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { m } from '#lib/paraglide/messages.js';

	let {
		value,
		placeholder,
		onsave,
		oncancel
	}: { value: string; placeholder: string; onsave: (name: string) => unknown; oncancel: () => void } = $props();

	// svelte-ignore state_referenced_locally
	let draft = $state(value);
</script>

<form
	class="flex items-center gap-1"
	onsubmit={(e) => {
		e.preventDefault();
		if (draft.trim()) onsave(draft.trim());
	}}
>
	<!-- svelte-ignore a11y_autofocus -->
	<Input
		bind:value={draft}
		{placeholder}
		maxlength={100}
		class="h-8"
		autofocus
		onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && oncancel()}
	/>
	<Button type="submit" size="icon" variant="ghost" class="size-8" aria-label={m.save()} disabled={!draft.trim()}><Check /></Button>
	<Button type="button" size="icon" variant="ghost" class="size-8" aria-label={m.cancel()} onclick={oncancel}><X /></Button>
</form>
