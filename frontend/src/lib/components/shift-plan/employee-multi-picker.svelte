<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import * as Command from '#lib/components/ui/command/index.js';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import type { EmployeeOption } from '#lib/remote/dictionaries.remote.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { cn } from '#lib/utils/index.ts';

	let {
		selected = $bindable([]),
		employees,
		busy = new Set<string>()
	}: { selected?: string[]; employees: EmployeeOption[]; busy?: Set<string> } = $props();

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
	}
</script>

<Command.Root class="rounded-lg border">
	<Command.Input placeholder={m.emp_search()} />
	<Command.List class="max-h-56">
		<Command.Empty>{m.emp_none()}</Command.Empty>
		{#each employees.filter((e) => e.active) as employee (employee.id)}
			{@const isSelected = selected.includes(employee.id)}
			<Command.Item value="{employee.fullName} {employee.login}" onSelect={() => toggle(employee.id)}>
				<UserAvatar name={employee.fullName} class="size-6 text-[10px]" />
				<span class="truncate" class:text-muted-foreground={busy.has(employee.id) && !isSelected}>{employee.fullName}</span>
				<Check class={cn('ml-auto', !isSelected && 'opacity-0')} />
			</Command.Item>
		{/each}
	</Command.List>
</Command.Root>
<p class="text-muted-foreground mt-1 text-xs">{m.sp_employees_selected({ count: selected.length })}</p>
