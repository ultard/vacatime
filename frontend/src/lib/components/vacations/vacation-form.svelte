<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import EmployeePicker from '#lib/components/app/employee-picker.svelte';
	import DateRangePicker from '#lib/components/app/date-range-picker.svelte';
	import TagInput from '#lib/components/app/tag-input.svelte';
	import FieldError from '#lib/components/app/field-error.svelte';
	import { VACATION_STATUSES, type VacationDto, type VacationStatus, type VacationTypeDto } from '#lib/api/types.ts';
	import type { EmployeeOption } from '#lib/remote/dictionaries.remote.ts';
	import { saveVacation } from '#lib/remote/vacations.remote.ts';
	import { priorityLabel, statusLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatRange, inclusiveDays, previewPriority } from '#lib/utils/date.ts';
	import { canMoveTo } from '#lib/utils/vacation.ts';

	let {
		vacation,
		types,
		employees,
		employeesComplete,
		defaultEmployeeId = ''
	}: {
		vacation?: VacationDto;
		types: VacationTypeDto[];
		employees: EmployeeOption[];
		employeesComplete: boolean;
		defaultEmployeeId?: string;
	} = $props();

	// `.for(id)` also fills the schema's `id` field, so only use it when editing.
	// svelte-ignore state_referenced_locally
	const form = vacation ? saveVacation.for(vacation.id) : saveVacation;
	const { fields } = form;

	// Local state for the custom controls; mirrored into hidden inputs.
	// svelte-ignore state_referenced_locally
	let employeeId = $state(vacation?.employee.id ?? defaultEmployeeId);
	// svelte-ignore state_referenced_locally
	let startDate = $state(vacation?.startDate ?? '');
	// svelte-ignore state_referenced_locally
	let endDate = $state(vacation?.endDate ?? '');
	// svelte-ignore state_referenced_locally
	let tags = $state<string[]>(vacation?.tags ?? []);
	// svelte-ignore state_referenced_locally
	let version = $state<number | undefined>(vacation?.version ?? undefined);

	// svelte-ignore state_referenced_locally
	fields.set({
		title: vacation?.title ?? '',
		description: vacation?.description ?? '',
		vacationTypeId: vacation?.vacationType.id ?? types.find((t) => t.active && t.code === 'ANNUAL')?.id ?? '',
		status: vacation?.status ?? 'DRAFT',
		urgent: vacation?.urgent ?? false
	});

	const urgent = $derived(!!fields.urgent.value());
	const days = $derived(startDate && endDate && startDate <= endDate ? inclusiveDays(startDate, endDate) : 0);
	const statusOptions = $derived(
		VACATION_STATUSES.filter((s) => !vacation || s === vacation.status || canMoveTo(vacation, s))
	);
	const selectableTypes = $derived(types.filter((t) => t.active || t.id === vacation?.vacationType.id));

	let conflict = $state<VacationDto | null>(null);

	const diff = $derived.by(() => {
		if (!conflict) return [];
		const mine: Record<string, string> = {
			[m.vf_title()]: String(fields.title.value() ?? ''),
			[m.vf_employee()]: employees.find((e) => e.id === employeeId)?.fullName ?? employeeId,
			[m.vf_type()]: types.find((t) => t.id === fields.vacationTypeId.value())?.name ?? '',
			[m.vf_dates()]: startDate && endDate ? formatRange(startDate, endDate) : '',
			[m.vf_status()]: statusLabel(fields.status.value() as VacationStatus),
			[m.vf_urgent()]: urgent ? m.yes() : m.no(),
			[m.vf_tags()]: tags.join(', '),
			[m.vf_description()]: String(fields.description.value() ?? '')
		};
		const theirs: Record<string, string> = {
			[m.vf_title()]: conflict.title,
			[m.vf_employee()]: conflict.employee.fullName,
			[m.vf_type()]: conflict.vacationType.name,
			[m.vf_dates()]: formatRange(conflict.startDate, conflict.endDate),
			[m.vf_status()]: statusLabel(conflict.status),
			[m.vf_urgent()]: conflict.urgent ? m.yes() : m.no(),
			[m.vf_tags()]: conflict.tags.join(', '),
			[m.vf_description()]: conflict.description ?? ''
		};
		return Object.keys(mine)
			.filter((key) => mine[key] !== theirs[key])
			.map((key) => ({ field: key, mine: mine[key], theirs: theirs[key] }));
	});

	function useSaved(latest: VacationDto) {
		employeeId = latest.employee.id;
		startDate = latest.startDate;
		endDate = latest.endDate;
		tags = [...latest.tags];
		version = latest.version ?? undefined;
		fields.set({
			title: latest.title,
			description: latest.description ?? '',
			vacationTypeId: latest.vacationType.id,
			status: latest.status,
			urgent: latest.urgent
		});
		conflict = null;
	}

	async function overwrite(latest: VacationDto) {
		version = latest.version ?? undefined;
		conflict = null;
		await tick();
		form.element?.requestSubmit();
	}

	const enhanced = form.enhance(async ({ submit }) => {
		await submit();
		const result = form.result;
		if (result && 'conflict' in result && result.conflict) {
			conflict = result.conflict;
		} else if (result && 'saved' in result && result.saved) {
			toast.success(vacation ? m.vf_saved() : m.vf_created());
			await goto(`/vacations/${result.saved.id}`, { replace: !!vacation });
		}
	});

	const formIssues = $derived(fields.issues());
	const selectClass =
		'vt-select border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]';
</script>

<form {...enhanced} class="grid gap-5" novalidate>
	{#if vacation}<input {...fields.id.as('hidden', vacation.id)} />{/if}
	{#if version !== undefined}<input {...fields.version.as('hidden', version)} />{/if}
	<input {...fields.employeeId.as('hidden', employeeId)} />
	<input {...fields.startDate.as('hidden', startDate)} />
	<input {...fields.endDate.as('hidden', endDate)} />
	<input {...fields.tags.as('hidden', JSON.stringify(tags))} />

	<div class="grid content-start gap-1.5">
		<Label for="vf-title">{m.vf_title()}</Label>
		<Input id="vf-title" placeholder={m.vf_title_placeholder()} maxlength={255} {...fields.title.as('text')} />
		<FieldError issues={fields.title.issues()} />
	</div>

	<div class="grid gap-5 sm:grid-cols-2">
		<div class="grid content-start gap-1.5">
			<Label for="vf-employee">{m.vf_employee()}</Label>
			<EmployeePicker
				id="vf-employee"
				bind:value={employeeId}
				{employees}
				complete={employeesComplete}
				invalid={!!fields.employeeId.issues()?.length}
			/>
			<FieldError issues={fields.employeeId.issues()} />
		</div>
		<div class="grid content-start gap-1.5">
			<Label for="vf-type">{m.vf_type()}</Label>
			<select id="vf-type" class={selectClass} {...fields.vacationTypeId.as('select')}>
				{#each selectableTypes as type (type.id)}
					<option value={type.id}>{type.name}{type.active ? '' : ` ${m.vf_type_inactive()}`}</option>
				{/each}
			</select>
			<FieldError issues={fields.vacationTypeId.issues()} />
		</div>
	</div>

	<div class="grid gap-5 sm:grid-cols-2">
		<div class="grid content-start gap-1.5">
			<Label for="vf-dates">{m.vf_dates()}</Label>
			<DateRangePicker
				id="vf-dates"
				bind:start={startDate}
				bind:end={endDate}
				invalid={!!(fields.startDate.issues()?.length || fields.endDate.issues()?.length)}
			/>
			<FieldError issues={[...(fields.startDate.issues() ?? []), ...(fields.endDate.issues() ?? [])]} />
		</div>
		<div class="grid content-start gap-1.5">
			<Label for="vf-status">{m.vf_status()}</Label>
			<select id="vf-status" class={selectClass} {...fields.status.as('select')}>
				{#each statusOptions as status (status)}
					<option value={status}>{statusLabel(status)}</option>
				{/each}
			</select>
			<FieldError issues={fields.status.issues()} />
		</div>
	</div>

	<label class="flex items-start gap-3 rounded-lg border p-3">
		<input class="accent-primary mt-0.5 size-4" {...fields.urgent.as('checkbox')} />
		<span class="grid gap-0.5">
			<span class="text-sm font-medium">{m.vf_urgent()}</span>
			<span class="text-muted-foreground text-xs">{m.vf_urgent_hint()}</span>
		</span>
	</label>

	{#if days > 0}
		<p class="bg-muted/60 text-muted-foreground rounded-lg px-3 py-2 text-sm" aria-live="polite">
			{m.vf_preview({ days: m.days_long({ count: days }), priority: priorityLabel(previewPriority(days, urgent)) })}
		</p>
	{/if}

	<div class="grid content-start gap-1.5">
		<Label for="vf-tags">{m.vf_tags()}</Label>
		<TagInput id="vf-tags" bind:tags />
		<FieldError issues={fields.tags.issues()} />
	</div>

	<div class="grid content-start gap-1.5">
		<Label for="vf-description">{m.vf_description()}</Label>
		<Textarea
			id="vf-description"
			rows={4}
			maxlength={4000}
			class="field-sizing-content min-h-24"
			{...fields.description.as('text')}
		/>
		<FieldError issues={fields.description.issues()} />
	</div>

	{#if formIssues?.length}
		<div role="alert" class="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{formIssues[0].message}</div>
	{/if}

	<div class="flex justify-end gap-2">
		<Button variant="ghost" href={vacation ? `/vacations/${vacation.id}` : '/vacations'}>{m.cancel()}</Button>
		<Button type="submit" disabled={form.pending > 0}>
			{#if form.pending}<Spinner />{/if}
			{vacation ? m.save() : m.create()}
		</Button>
	</div>
</form>

<Dialog.Root open={!!conflict} onOpenChange={(open) => !open && (conflict = null)}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{m.vf_conflict_title()}</Dialog.Title>
			<Dialog.Description>{m.vf_conflict_desc({ version: conflict?.version ?? 0 })}</Dialog.Description>
		</Dialog.Header>
		{#if diff.length}
			<div class="overflow-auto rounded-lg border text-sm">
				<table class="w-full">
					<thead class="bg-muted/50 text-left">
						<tr>
							<th class="p-2 font-medium">{m.vf_conflict_field()}</th>
							<th class="p-2 font-medium">{m.vf_conflict_mine()}</th>
							<th class="p-2 font-medium">{m.vf_conflict_theirs()}</th>
						</tr>
					</thead>
					<tbody>
						{#each diff as row (row.field)}
							<tr class="border-t align-top">
								<td class="text-muted-foreground p-2">{row.field}</td>
								<td class="bg-primary/5 p-2">{row.mine || m.none()}</td>
								<td class="bg-sunset/10 p-2">{row.theirs || m.none()}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-muted-foreground text-sm">{m.vf_conflict_same()}</p>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => conflict && useSaved(conflict)}>{m.vf_conflict_reload()}</Button>
			<Button onclick={() => conflict && overwrite(conflict)}>{m.vf_conflict_overwrite()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
