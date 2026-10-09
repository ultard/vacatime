<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';
	import Flame from '@lucide/svelte/icons/flame';
	import Archive from '@lucide/svelte/icons/archive';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import StatusBadge from '#lib/components/app/status-badge.svelte';
	import PriorityBadge from '#lib/components/app/priority-badge.svelte';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import type { VacationDto } from '#lib/api/types.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatRange } from '#lib/utils/date.ts';

	let {
		vacations,
		selected,
		selectable,
		onopen
	}: {
		vacations: VacationDto[];
		selected: SvelteSet<string>;
		selectable: boolean;
		onopen: (vacation: VacationDto, event: MouseEvent) => void;
	} = $props();

	const allSelected = $derived(vacations.length > 0 && vacations.every((v) => selected.has(v.id)));
	const someSelected = $derived(!allSelected && vacations.some((v) => selected.has(v.id)));

	function toggleAll(checked: boolean) {
		for (const v of vacations) {
			if (checked) selected.add(v.id);
			else selected.delete(v.id);
		}
	}
</script>

<div class="@container overflow-hidden rounded-xl border">
	<Table.Root>
		<Table.Header class="bg-muted/40">
			<Table.Row>
				{#if selectable}
					<Table.Head class="w-10">
						<Checkbox
							checked={allSelected}
							indeterminate={someSelected}
							onCheckedChange={(v) => toggleAll(!!v)}
							aria-label={m.select_all()}
						/>
					</Table.Head>
				{/if}
				<Table.Head>{m.vac_col_vacation()}</Table.Head>
				<Table.Head class="hidden @2xl:table-cell">{m.vac_col_employee()}</Table.Head>
				<Table.Head class="hidden @4xl:table-cell">{m.vac_col_type()}</Table.Head>
				<Table.Head>{m.vac_col_dates()}</Table.Head>
				<Table.Head>{m.vac_col_status()}</Table.Head>
				<Table.Head class="hidden @3xl:table-cell">{m.vac_col_priority()}</Table.Head>
				<Table.Head class="hidden @5xl:table-cell">{m.vac_col_tags()}</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each vacations as vacation (vacation.id)}
				<Table.Row
					class="cursor-pointer"
					data-state={selected.has(vacation.id) ? 'selected' : undefined}
					onclick={(event: MouseEvent) => {
						if ((event.target as HTMLElement).closest('button, a, input, [role=checkbox]')) return;
						onopen(vacation, event);
					}}
				>
					{#if selectable}
						<Table.Cell>
							<Checkbox
								checked={selected.has(vacation.id)}
								onCheckedChange={(v) => (v ? selected.add(vacation.id) : selected.delete(vacation.id))}
								aria-label={m.select_row({ title: vacation.title })}
							/>
						</Table.Cell>
					{/if}
					<Table.Cell class="max-w-72">
						<a
							href="/vacations/{vacation.id}"
							class="hover:text-primary flex items-center gap-1.5 font-medium"
							onclick={(event) => {
								if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
								event.preventDefault();
								onopen(vacation, event);
							}}
						>
							{#if vacation.urgent}<Flame class="text-sunset size-3.5 shrink-0" aria-label={m.urgent()} />{/if}
							{#if vacation.archived}<Archive class="text-muted-foreground size-3.5 shrink-0" aria-label={m.archived()} />{/if}
							<span class="truncate">{vacation.title}</span>
						</a>
						<span class="text-muted-foreground block truncate font-mono text-[11px]">{vacation.vacationNumber}</span>
						<span class="text-muted-foreground block truncate text-xs @2xl:hidden">{vacation.employee.fullName}</span>
					</Table.Cell>
					<Table.Cell class="hidden @2xl:table-cell">
						<span class="flex items-center gap-2">
							<UserAvatar name={vacation.employee.fullName} class="size-7" />
							<span class="truncate">{vacation.employee.fullName}</span>
						</span>
					</Table.Cell>
					<Table.Cell class="text-muted-foreground hidden @4xl:table-cell">{vacation.vacationType.name}</Table.Cell>
					<Table.Cell class="whitespace-nowrap">
						<span class="tabular-nums">{formatRange(vacation.startDate, vacation.endDate)}</span>
						<span class="text-muted-foreground block text-xs tabular-nums">{m.days_count({ count: vacation.daysCount })}</span>
					</Table.Cell>
					<Table.Cell><StatusBadge status={vacation.status} /></Table.Cell>
					<Table.Cell class="hidden @3xl:table-cell"><PriorityBadge priority={vacation.priority} /></Table.Cell>
					<Table.Cell class="hidden max-w-48 @5xl:table-cell">
						<span class="flex flex-wrap gap-1">
							{#each vacation.tags as tag (tag)}
								<span class="bg-secondary rounded px-1.5 py-0.5 text-[11px]">{tag}</span>
							{/each}
						</span>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
