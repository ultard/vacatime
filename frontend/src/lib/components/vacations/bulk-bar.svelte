<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Tag from '@lucide/svelte/icons/tag';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import NativeSelect from '#lib/components/app/native-select.svelte';
	import { VACATION_STATUSES, type BulkOperation, type BulkResult, type VacationStatus } from '#lib/api/types.ts';
	import { bulkVacations } from '#lib/remote/vacations.remote.ts';
	import type { RemoteQueryUpdate } from '$app/server';
	import { statusLabel } from '#lib/labels.ts';
	import { localizeBackendMessage } from '#lib/api/messages.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/utils/errors.ts';

	let {
		selected,
		titles,
		updates = []
	}: { selected: SvelteSet<string>; titles: Map<string, string>; updates?: RemoteQueryUpdate[] } = $props();

	let status = $state<VacationStatus | ''>('');
	let tag = $state('');
	let report = $state<BulkResult | null>(null);

	async function run(operation: BulkOperation, extra: { status?: VacationStatus; tag?: string } = {}) {
		const ids = [...selected];
		try {
			const result = await bulkVacations({ ids, operation, ...extra }).updates(...updates);
			const failed = Object.keys(result.errors).length;
			if (failed) report = result;
			else toast.success(m.bulk_done({ ok: result.successfulIds.length, total: ids.length }));
			for (const id of result.successfulIds) selected.delete(id);
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}
</script>

{#if selected.size}
	<div
		class="bg-popover text-popover-foreground fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-fit flex-wrap items-center gap-2 rounded-2xl border p-2 pl-4 shadow-2xl motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6"
		role="toolbar"
		aria-label={m.bulk_selected({ count: selected.size })}
	>
		<span class="text-sm font-medium tabular-nums">{m.bulk_selected({ count: selected.size })}</span>
		<Button size="sm" variant="ghost" disabled={bulkVacations.pending > 0} onclick={() => run('ARCHIVE')}>
			<Archive />{m.bulk_archive()}
		</Button>
		<Button size="sm" variant="ghost" disabled={bulkVacations.pending > 0} onclick={() => run('RESTORE')}>
			<ArchiveRestore />{m.bulk_restore()}
		</Button>
		<div class="flex items-center gap-1">
			<NativeSelect
				class="w-44"
				bind:value={status}
				placeholder={m.bulk_status()}
				aria-label={m.bulk_status()}
				options={VACATION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
				onchange={() => {
					if (status) run('CHANGE_STATUS', { status });
					status = '';
				}}
			/>
		</div>
		<form
			class="flex items-center gap-1"
			onsubmit={(event) => event.preventDefault()}
		>
			<Input class="h-8 w-28" placeholder={m.bulk_tag_placeholder()} bind:value={tag} maxlength={100} aria-label={m.bulk_tag_placeholder()} />
			<Button size="sm" variant="ghost" disabled={!tag.trim()} onclick={() => run('ADD_TAG', { tag: tag.trim() })}>
				<Tag />{m.bulk_add_tag()}
			</Button>
			<Button size="sm" variant="ghost" disabled={!tag.trim()} onclick={() => run('REMOVE_TAG', { tag: tag.trim() })}>
				{m.bulk_remove_tag()}
			</Button>
		</form>
		<Button size="icon" variant="ghost" aria-label={m.bulk_clear()} onclick={() => selected.clear()}>
			<X />
		</Button>
	</div>
{/if}

<Dialog.Root open={!!report} onOpenChange={(open) => !open && (report = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.bulk_errors_title({ count: Object.keys(report?.errors ?? {}).length })}</Dialog.Title>
			<Dialog.Description>
				{m.bulk_done({
					ok: report?.successfulIds.length ?? 0,
					total: (report?.successfulIds.length ?? 0) + Object.keys(report?.errors ?? {}).length
				})}
			</Dialog.Description>
		</Dialog.Header>
		<ul class="grid max-h-80 gap-2 overflow-auto text-sm">
			{#each Object.entries(report?.errors ?? {}) as [id, message] (id)}
				<li class="bg-muted/50 rounded-lg p-2">
					<a class="font-medium hover:underline" href="/vacations/{id}">{titles.get(id) ?? id}</a>
					<p class="text-destructive">{localizeBackendMessage(message, 409)}</p>
				</li>
			{/each}
		</ul>
	</Dialog.Content>
</Dialog.Root>
