<script lang="ts">
	import * as Popover from '#lib/components/ui/popover/index.js';
	import type { EmployeeOption } from '#lib/remote/dictionaries.remote.ts';
	import type { CellPlan } from '#lib/utils/shift-plan.ts';
	import { m } from '#lib/paraglide/messages.js';
	import CellEditor from './cell-editor.svelte';

	let {
		cell,
		employees,
		busy,
		label,
		hint,
		invalid = false,
		onchange
	}: {
		cell: CellPlan | undefined;
		employees: EmployeeOption[];
		busy: Set<string>;
		label: string;
		hint?: string;
		invalid?: boolean;
		onchange: (cell: CellPlan | undefined) => void;
	} = $props();

	let open = $state(false);
	const short = $derived(cell ? cell.employeeIds.length < cell.minimumStaff : false);
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="grid h-12 w-full min-w-16 place-content-center rounded-lg border text-xs tabular-nums transition-colors hover:border-primary"
		aria-label={label}
		title={hint}
		data-state-kind={invalid ? 'invalid' : cell ? (short ? 'short' : 'ok') : 'empty'}
	>
		{#if cell}
			<span class="font-semibold">{cell.employeeIds.length}/{cell.minimumStaff}</span>
		{:else}
			<span class="text-muted-foreground">—</span>
		{/if}
		{#if hint}<span class="text-muted-foreground text-[9px] leading-none">{hint}</span>{/if}
	</Popover.Trigger>
	<Popover.Content class="w-80" align="start">
		<p class="mb-3 text-sm font-medium">{label}</p>
		{#if open}
			<CellEditor
				{cell}
				{employees}
				{busy}
				onchange={(next) => {
					onchange(next);
					open = false;
				}}
			/>
		{/if}
	</Popover.Content>
</Popover.Root>

<style>
	:global([data-state-kind='ok']) {
		background: color-mix(in oklch, var(--status-approved) 18%, transparent);
	}
	:global([data-state-kind='short']) {
		background: color-mix(in oklch, var(--status-pending) 30%, transparent);
	}
	:global([data-state-kind='invalid']) {
		background: color-mix(in oklch, var(--status-rejected) 25%, transparent);
		border-color: var(--status-rejected);
	}
</style>
