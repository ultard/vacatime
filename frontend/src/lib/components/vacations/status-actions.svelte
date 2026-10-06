<script lang="ts">
	import { toast } from 'svelte-sonner';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';
	import Send from '@lucide/svelte/icons/send';
	import Ban from '@lucide/svelte/icons/ban';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { VACATION_STATUSES, type VacationDto, type VacationStatus } from '#lib/api/types.ts';
	import { changeStatus, getVacation } from '#lib/remote/vacations.remote.ts';
	import { statusLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorInfo } from '#lib/utils/errors.ts';
	import { canApprove } from '#lib/utils/vacation.ts';

	let { vacation }: { vacation: VacationDto } = $props();

	async function set(status: VacationStatus) {
		try {
			await changeStatus({ id: vacation.id, status, version: vacation.version }).updates(
				getVacation(vacation.id).withOverride((v) => ({ ...v, status }))
			);
			toast.success(m.vd_status_changed({ status: statusLabel(status) }));
		} catch (error) {
			const info = errorInfo(error);
			toast.error(info.code === 'VERSION_CONFLICT' ? m.vd_stale() : info.message);
			void getVacation(vacation.id).refresh();
		}
	}

	const quick = $derived.by(() => {
		const actions: { status: VacationStatus; label: string; icon: typeof Check; variant: 'default' | 'outline' }[] = [];
		if (vacation.status === 'DRAFT') actions.push({ status: 'PENDING', label: m.vd_submit(), icon: Send, variant: 'default' });
		if (vacation.status === 'PENDING' && canApprove(vacation)) {
			actions.push({ status: 'APPROVED', label: m.vd_approve(), icon: Check, variant: 'default' });
			actions.push({ status: 'REJECTED', label: m.vd_reject(), icon: Ban, variant: 'outline' });
		}
		return actions;
	});
	const busy = $derived(changeStatus.pending > 0);
</script>

<div class="flex flex-wrap gap-2">
	{#each quick as action (action.status)}
		<Button size="sm" variant={action.variant} disabled={busy} onclick={() => set(action.status)}>
			<action.icon />
			{action.label}
		</Button>
	{/each}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} size="sm" variant="outline" disabled={busy}>
					{m.vd_change_status()}
					<ChevronDown />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start">
			{#each VACATION_STATUSES as status (status)}
				<DropdownMenu.Item
					disabled={status === vacation.status || (status === 'APPROVED' && !canApprove(vacation))}
					onSelect={() => set(status)}
				>
					<span class="size-2 rounded-full" style:background="var(--status-{status.toLowerCase()})"></span>
					{statusLabel(status)}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
