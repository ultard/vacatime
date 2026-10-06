<script lang="ts">
	import Trash from '@lucide/svelte/icons/trash-2';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { EmployeeOption } from '#lib/remote/dictionaries.remote.ts';
	import type { CellPlan } from '#lib/utils/shift-plan.ts';
	import { m } from '#lib/paraglide/messages.js';
	import EmployeeMultiPicker from './employee-multi-picker.svelte';

	let {
		cell,
		employees,
		busy,
		onchange
	}: {
		cell: CellPlan | undefined;
		employees: EmployeeOption[];
		busy: Set<string>;
		onchange: (cell: CellPlan | undefined) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let minimum = $state(cell?.minimumStaff ?? 1);
	// svelte-ignore state_referenced_locally
	let selected = $state<string[]>(cell?.employeeIds ?? []);
</script>

<div class="grid gap-3">
	<div class="grid gap-1.5">
		<Label for="cell-min">{m.sp_cell_min()}</Label>
		<Input id="cell-min" type="number" min="0" max="99" bind:value={minimum} class="w-24" />
	</div>
	<div class="grid gap-1.5">
		<Label>{m.sp_cell_staff()}</Label>
		<EmployeeMultiPicker bind:selected {employees} {busy} />
	</div>
	<div class="flex justify-between gap-2">
		{#if cell}
			<Button variant="ghost" size="sm" class="text-destructive" onclick={() => onchange(undefined)}>
				<Trash />{m.sp_cell_remove()}
			</Button>
		{/if}
		<Button
			size="sm"
			class="ml-auto"
			onclick={() => onchange({ minimumStaff: Math.max(0, Math.floor(Number(minimum) || 0)), employeeIds: selected })}
		>
			{m.save()}
		</Button>
	</div>
</div>
