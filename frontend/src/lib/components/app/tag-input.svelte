<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { m } from '#lib/paraglide/messages.js';

	const MAX_TAGS = 20;
	const MAX_LENGTH = 100;

	let { tags = $bindable([]), id }: { tags?: string[]; id?: string } = $props();
	let draft = $state('');

	function add(raw: string) {
		const tag = raw.trim().slice(0, MAX_LENGTH);
		if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
		tags = [...tags, tag];
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			add(draft);
			draft = '';
		} else if (event.key === 'Backspace' && !draft && tags.length) {
			tags = tags.slice(0, -1);
		}
	}
</script>

<div
	class="border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 text-sm shadow-xs focus-within:ring-[3px]"
>
	{#each tags as tag (tag)}
		<span class="bg-secondary inline-flex h-6 items-center gap-1 rounded-md pr-1 pl-2 text-xs">
			{tag}
			<button
				type="button"
				class="hover:bg-foreground/10 grid size-4 place-items-center rounded"
				aria-label={m.tags_remove({ tag })}
				onclick={() => (tags = tags.filter((t) => t !== tag))}
			>
				<X class="size-3" />
			</button>
		</span>
	{/each}
	<input
		{id}
		bind:value={draft}
		{onkeydown}
		onblur={() => {
			add(draft);
			draft = '';
		}}
		disabled={tags.length >= MAX_TAGS}
		maxlength={MAX_LENGTH}
		placeholder={tags.length >= MAX_TAGS ? m.tags_limit() : m.tags_placeholder()}
		class="placeholder:text-muted-foreground min-w-32 flex-1 bg-transparent outline-none"
	/>
</div>
