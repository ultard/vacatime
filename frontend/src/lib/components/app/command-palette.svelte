<script lang="ts">
	import { goto } from '$app/navigation';
	import { toggleMode } from 'mode-watcher';
	import Plus from '@lucide/svelte/icons/plus';
	import SunMoon from '@lucide/svelte/icons/sun-moon';
	import Languages from '@lucide/svelte/icons/languages';
	import * as Command from '#lib/components/ui/command/index.js';
	import { getUser } from '#lib/context.ts';
	import { navFor } from '#lib/nav.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, setLocale } from '#lib/paraglide/runtime.js';
	import { hotkey } from '#lib/attachments/hotkey.ts';
	import VacationSearchResults from './vacation-search-results.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const user = getUser();
	const groups = $derived(navFor(user()));
	let search = $state('');

	function run(action: () => unknown) {
		open = false;
		search = '';
		action();
	}
</script>

<svelte:window {@attach hotkey('mod+k', () => (open = !open))} />

<Command.Dialog bind:open title={m.cmd_search()} description={m.cmd_placeholder()} shouldFilter={true}>
	<Command.Input placeholder={m.cmd_placeholder()} bind:value={search} />
	<Command.List>
		<Command.Empty>{m.cmd_empty()}</Command.Empty>
		{#if search.trim().length >= 2}
			<VacationSearchResults text={search.trim()} onselect={(id) => run(() => goto(`/vacations/${id}`))} />
		{/if}
		<Command.Group heading={m.cmd_actions()}>
			{#if user().canEdit}
				<Command.Item value="new vacation {m.nav_new_vacation()}" onSelect={() => run(() => goto('/vacations/new'))}>
					<Plus />
					{m.nav_new_vacation()}
				</Command.Item>
			{/if}
			<Command.Item value="theme {m.cmd_toggle_theme()}" onSelect={() => run(toggleMode)}>
				<SunMoon />
				{m.cmd_toggle_theme()}
			</Command.Item>
			<Command.Item
				value="language {m.cmd_switch_language()}"
				onSelect={() => run(() => setLocale(getLocale() === 'ru' ? 'en' : 'ru'))}
			>
				<Languages />
				{m.cmd_switch_language()}
			</Command.Item>
		</Command.Group>
		{#each groups as group (group.label())}
			<Command.Group heading={group.label()}>
				{#each group.items as item (item.href)}
					<Command.Item value="{item.href} {item.label()}" onSelect={() => run(() => goto(item.href))}>
						<item.icon />
						{item.label()}
					</Command.Item>
				{/each}
			</Command.Group>
		{/each}
	</Command.List>
</Command.Dialog>
