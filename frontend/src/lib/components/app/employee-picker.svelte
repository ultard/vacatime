<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Info from '@lucide/svelte/icons/info';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { EmployeeOption } from '#lib/remote/dictionaries.remote.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { cn } from '#lib/utils/index.ts';
	import UserAvatar from './user-avatar.svelte';

	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

	let {
		value = $bindable(''),
		employees,
		complete = true,
		id,
		invalid = false,
		placeholder = m.emp_placeholder(),
		onchange
	}: {
		value?: string;
		employees: EmployeeOption[];
		complete?: boolean;
		id?: string;
		invalid?: boolean;
		placeholder?: string;
		onchange?: (id: string) => void;
	} = $props();

	let open = $state(false);
	let search = $state('');
	const selected = $derived(employees.find((e) => e.id === value));
	const typedUuid = $derived(search.trim());
	const canUseUuid = $derived(UUID_RE.test(typedUuid) && !employees.some((e) => e.id === typedUuid));

	function choose(id: string) {
		value = id;
		open = false;
		search = '';
		onchange?.(id);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				{id}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				aria-invalid={invalid}
				class={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
			>
				{#if selected}
					<span class="flex min-w-0 items-center gap-2">
						<UserAvatar name={selected.fullName} class="size-5 text-[10px]" />
						<span class="truncate">{selected.fullName}</span>
					</span>
				{:else if value}
					<span class="truncate font-mono text-xs">{m.emp_unknown({ id: value })}</span>
				{:else}
					{placeholder}
				{/if}
				<ChevronsUpDown class="opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-(--bits-popover-anchor-width) min-w-72 p-0" align="start">
		<Command.Root>
			<Command.Input placeholder={m.emp_search()} bind:value={search} />
			<Command.List>
				<Command.Empty>{m.emp_none()}</Command.Empty>
				{#if canUseUuid}
					<Command.Group heading={m.emp_by_uuid()}>
						<Command.Item value={typedUuid} onSelect={() => choose(typedUuid)}>
							<span class="truncate font-mono text-xs">{m.emp_use_uuid({ id: typedUuid })}</span>
						</Command.Item>
					</Command.Group>
				{/if}
				<Command.Group>
					{#each employees as employee (employee.id)}
						<Command.Item
							value="{employee.fullName} {employee.login} {employee.id}"
							onSelect={() => choose(employee.id)}
						>
							<UserAvatar name={employee.fullName} class="size-6 text-[10px]" />
							<span class="grid min-w-0">
								<span class="truncate" class:text-muted-foreground={!employee.active}>{employee.fullName}</span>
								<span class="text-muted-foreground truncate text-xs">@{employee.login}</span>
							</span>
							<Check class={cn('ml-auto', value !== employee.id && 'opacity-0')} />
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
			{#if !complete}
				<p class="text-muted-foreground flex gap-2 border-t p-3 text-xs">
					<Info class="mt-0.5 size-3.5 shrink-0" />
					{m.emp_partial_hint()}
				</p>
			{/if}
		</Command.Root>
	</Popover.Content>
</Popover.Root>
