<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';
	import { searchVacations } from '#lib/remote/vacations.remote.ts';
	import { m } from '#lib/paraglide/messages.js';
	import StatusDot from './status-dot.svelte';

	let { text, onselect }: { text: string; onselect: (id: string) => void } = $props();

	let debounced = $state('');
	$effect(() => {
		const value = text;
		const timer = setTimeout(() => (debounced = value), 200);
		return () => clearTimeout(timer);
	});

	const results = $derived(debounced ? searchVacations(debounced) : null);
</script>

{#if results?.current?.length}
	<Command.Group heading={m.cmd_vacations()}>
		{#each results.current as vacation (vacation.id)}
			<Command.Item value="{text} {vacation.id}" onSelect={() => onselect(vacation.id)}>
				<StatusDot status={vacation.status} />
				<span class="truncate">{vacation.title}</span>
				<span class="text-muted-foreground ml-auto truncate text-xs">{vacation.employee.fullName}</span>
			</Command.Item>
		{/each}
	</Command.Group>
{/if}
