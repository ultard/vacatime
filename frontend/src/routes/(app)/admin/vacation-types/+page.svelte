<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import VacationTypeForm from '#lib/components/admin/vacation-type-form.svelte';
	import type { VacationTypeDto } from '#lib/api/types.ts';
	import { listVacationTypes } from '#lib/remote/dictionaries.remote.ts';
	import { m } from '#lib/paraglide/messages.js';

	let editing = $state<VacationTypeDto | 'new' | null>(null);
</script>

<svelte:head><title>{m.types_title()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-5 py-6">
	<div class="flex flex-wrap items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{m.types_title()}</h1>
		<Button class="ml-auto" onclick={() => (editing = 'new')}><Plus />{m.types_new()}</Button>
	</div>
	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-64 w-full" />{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		<ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each await listVacationTypes() as type (type.id)}
				<li class="bg-card grid gap-2 rounded-2xl border p-4" class:opacity-60={!type.active}>
					<div class="flex items-start gap-2">
						<span class="bg-secondary rounded px-2 py-0.5 font-mono text-xs">{type.code}</span>
						<span class="text-muted-foreground ml-auto text-xs">{type.active ? m.active() : m.inactive()}</span>
						<Button size="icon" variant="ghost" class="-mt-1 -mr-1 size-8" aria-label={m.edit()} onclick={() => (editing = type)}>
							<Pencil />
						</Button>
					</div>
					<p class="font-medium">{type.name}</p>
					{#if type.description}<p class="text-muted-foreground text-sm">{type.description}</p>{/if}
				</li>
			{/each}
		</ul>
	</svelte:boundary>
</div>

<Sheet.Root open={!!editing} onOpenChange={(open) => !open && (editing = null)}>
	<Sheet.Content class="w-full sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title>{editing === 'new' ? m.types_new() : m.types_edit()}</Sheet.Title>
		</Sheet.Header>
		<div class="px-4 pb-6">
			{#if editing}
				{#key editing === 'new' ? 'new' : editing.id}
					<VacationTypeForm type={editing === 'new' ? undefined : editing} onsaved={() => (editing = null)} />
				{/key}
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
