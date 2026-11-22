<script lang="ts" generics="T extends string">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/index.ts';

	let {
		value = $bindable(),
		options,
		placeholder,
		class: className,
		...rest
	}: Omit<HTMLSelectAttributes, 'value'> & {
		value?: T | '' | undefined;
		options: readonly { value: T; label: string }[];
		placeholder?: string;
	} = $props();
</script>

<!-- Native <select> with the new customizable select (appearance: base-select) where supported. -->
<div class={cn('relative', className)}>
	<select
		bind:value
		{...rest}
		class="vt-select border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full appearance-none rounded-md border bg-transparent py-1 pr-3 pl-3 [@supports_not_(appearance:base-select)]:pr-8 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50 dark:bg-transparent"
	>
		{#if placeholder !== undefined}
			<option value="">{placeholder}</option>
		{/if}
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	<ChevronDown class="vt-select-chevron text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2" />
</div>
