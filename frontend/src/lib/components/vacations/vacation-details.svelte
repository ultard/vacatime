<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Flame from '@lucide/svelte/icons/flame';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Trash from '@lucide/svelte/icons/trash-2';
	import Info from '@lucide/svelte/icons/info';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import StatusBadge from '#lib/components/app/status-badge.svelte';
	import PriorityBadge from '#lib/components/app/priority-badge.svelte';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import CopyId from '#lib/components/app/copy-id.svelte';
	import ConfirmDialog from '#lib/components/app/confirm-dialog.svelte';
	import type { VacationDto } from '#lib/api/types.ts';
	import { archiveVacation, deleteVacation, getVacation, restoreVacation } from '#lib/remote/vacations.remote.ts';
	import { getUser } from '#lib/context.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatRange } from '#lib/utils/date.ts';
	import { errorMessage } from '#lib/utils/errors.ts';
	import StatusActions from './status-actions.svelte';
	import VacationNotes from './vacation-notes.svelte';

	let { vacation, ondeleted }: { vacation: VacationDto; ondeleted?: () => void } = $props();
	const user = getUser();

	let confirmArchive = $state(false);
	let confirmDelete = $state(false);

	async function archive() {
		try {
			await archiveVacation(vacation.id).updates(getVacation(vacation.id).withOverride((v) => ({ ...v, archived: true })));
			toast.success(m.vd_archived_done());
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}

	async function restore() {
		try {
			await restoreVacation(vacation.id).updates(getVacation(vacation.id).withOverride((v) => ({ ...v, archived: false })));
			toast.success(m.vd_restored_done());
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}

	async function remove() {
		try {
			await deleteVacation(vacation.id);
			toast.success(m.vd_deleted_done());
			if (ondeleted) ondeleted();
			else await goto('/vacations');
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}
</script>

<article class="grid gap-6">
	<header class="grid gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<StatusBadge status={vacation.status} />
			{#if vacation.urgent}
				<span class="text-sunset inline-flex items-center gap-1 text-xs font-medium"><Flame class="size-3.5" />{m.urgent()}</span>
			{/if}
			<span class="text-muted-foreground ml-auto text-xs">{m.vd_version({ version: vacation.version ?? 0 })}</span>
		</div>
		<h2 class="text-2xl font-semibold tracking-tight text-balance">{vacation.title}</h2>
		<CopyId id={vacation.vacationNumber} label={vacation.vacationNumber} />
	</header>

	{#if vacation.archived}
		<div class="bg-muted text-muted-foreground flex gap-2 rounded-lg p-3 text-sm">
			<Archive class="mt-0.5 size-4 shrink-0" />
			{m.vd_archived_banner()}
		</div>
	{/if}

	{#if user().canEdit}
		<div class="flex flex-wrap items-center gap-2">
			<StatusActions {vacation} />
			<Button size="sm" variant="outline" href="/vacations/{vacation.id}/edit"><Pencil />{m.edit()}</Button>
			{#if vacation.archived}
				<Button size="sm" variant="outline" onclick={restore}><ArchiveRestore />{m.vd_restore()}</Button>
			{:else}
				<Button size="sm" variant="ghost" onclick={() => (confirmArchive = true)}><Archive />{m.vd_archive()}</Button>
			{/if}
			{#if user().isAdmin}
				<Button size="sm" variant="ghost" class="text-destructive" onclick={() => (confirmDelete = true)}>
					<Trash />{m.vd_delete()}
				</Button>
			{/if}
		</div>
	{/if}

	<dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
		<dt class="text-muted-foreground">{m.vd_employee()}</dt>
		<dd class="flex items-center gap-2">
			<UserAvatar name={vacation.employee.fullName} class="size-6 text-[10px]" />
			<a class="hover:underline" href="/vacations?employee={vacation.employee.id}&archived=all">{vacation.employee.fullName}</a>
			<span class="text-muted-foreground">@{vacation.employee.login}</span>
		</dd>
		<dt class="text-muted-foreground">{m.vd_type()}</dt>
		<dd>{vacation.vacationType.name}</dd>
		<dt class="text-muted-foreground">{m.vd_dates()}</dt>
		<dd class="tabular-nums">{formatRange(vacation.startDate, vacation.endDate)}</dd>
		<dt class="text-muted-foreground">{m.vd_days()}</dt>
		<dd class="tabular-nums">{m.days_long({ count: vacation.daysCount })}</dd>
		<dt class="text-muted-foreground">{m.vd_priority()}</dt>
		<dd class="flex items-center gap-1.5">
			<PriorityBadge priority={vacation.priority} />
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger class="text-muted-foreground" aria-label={m.vd_priority_hint()}><Info class="size-3.5" /></Tooltip.Trigger>
					<Tooltip.Content class="max-w-64">{m.vd_priority_hint()}</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</dd>
		{#if vacation.tags.length}
			<dt class="text-muted-foreground">{m.vd_tags()}</dt>
			<dd class="flex flex-wrap gap-1">
				{#each vacation.tags as tag (tag)}
					<a href="/vacations?tag={encodeURIComponent(tag)}&archived=all" class="bg-secondary rounded px-2 py-0.5 text-xs hover:underline">{tag}</a>
				{/each}
			</dd>
		{/if}
		{#if vacation.description}
			<dt class="text-muted-foreground">{m.vd_description()}</dt>
			<dd class="whitespace-pre-wrap">{vacation.description}</dd>
		{/if}
	</dl>

	<VacationNotes vacationId={vacation.id} />
</article>

<ConfirmDialog bind:open={confirmArchive} description={m.vd_archive_confirm()} confirmLabel={m.vd_archive()} onconfirm={archive} />
<ConfirmDialog
	bind:open={confirmDelete}
	description={m.vd_delete_confirm()}
	confirmLabel={m.vd_delete()}
	destructive
	onconfirm={remove}
/>
