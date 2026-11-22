<script lang="ts">
	import { toast } from 'svelte-sonner';
	import FileUp from '@lucide/svelte/icons/file-up';
	import FileText from '@lucide/svelte/icons/file-text';
	import Download from '@lucide/svelte/icons/download';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import StatusBadge from '#lib/components/app/status-badge.svelte';
	import type { ImportApplyResult, ImportMode, ImportPreviewResult } from '#lib/api/types.ts';
	import { applyImport, previewImport } from '#lib/remote/csv.remote.ts';
	import { localizeBackendMessage } from '#lib/api/messages.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatRange } from '#lib/utils/date.ts';
	import { errorMessage } from '#lib/utils/errors.ts';
	import { csvTemplate, readCsvFile } from '#lib/utils/csv.ts';

	let file = $state<{ name: string; text: string } | null>(null);
	let mode = $state<ImportMode>('CREATE_ONLY');
	let preview = $state<ImportPreviewResult | null>(null);
	let result = $state<ImportApplyResult | null>(null);
	let dragOver = $state(false);
	let input = $state<HTMLInputElement>();

	async function choose(selected: File | undefined) {
		if (!selected) return;
		try {
			file = await readCsvFile(selected);
			preview = null;
			result = null;
			await runPreview();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	}

	async function runPreview() {
		if (!file) return;
		try {
			preview = await previewImport({ csv: file.text, mode });
		} catch (error) {
			preview = null;
			toast.error(errorMessage(error));
		}
	}

	async function runApply() {
		if (!file) return;
		try {
			result = await applyImport({ csv: file.text, mode });
			const failed = Object.keys(result.errors).length;
			toast[failed ? 'warning' : 'success'](m.imp_done({ ok: result.successfulIds.length, failed }));
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}

	function downloadTemplate() {
		const url = URL.createObjectURL(new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8' }));
		const link = Object.assign(document.createElement('a'), { href: url, download: 'vacations-template.csv' });
		link.click();
		URL.revokeObjectURL(url);
	}

	const busy = $derived(previewImport.pending > 0 || applyImport.pending > 0);
	const rows = $derived(
		preview ? [...preview.validRows, ...preview.invalidRows].sort((a, b) => a.rowNumber - b.rowNumber) : []
	);
</script>

<svelte:head><title>{m.imp_title()} · {m.app_name()}</title></svelte:head>

<div class="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-5 py-6">
	<Button variant="ghost" size="sm" href="/vacations" class="w-fit"><ArrowLeft />{m.vac_title()}</Button>
	<div class="flex flex-wrap items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{m.imp_title()}</h1>
		<Button variant="outline" size="sm" class="ml-auto" onclick={downloadTemplate}><Download />{m.imp_template()}</Button>
	</div>
	<p class="text-muted-foreground text-sm">{m.imp_format()}</p>

	<button
		type="button"
		class="hover:border-primary hover:bg-primary/5 grid justify-items-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition-colors"
		class:border-primary={dragOver}
		class:bg-primary={false}
		onclick={() => input?.click()}
		ondragover={(e) => {
			e.preventDefault();
			dragOver = true;
		}}
		ondragleave={() => (dragOver = false)}
		ondrop={(e) => {
			e.preventDefault();
			dragOver = false;
			choose(e.dataTransfer?.files[0]);
		}}
	>
		{#if file}
			<FileText class="text-primary size-8" />
			<span class="font-medium">{file.name}</span>
			<span class="text-muted-foreground text-xs">{m.imp_change_file()}</span>
		{:else}
			<FileUp class="text-muted-foreground size-8" />
			<span class="font-medium">{m.imp_drop()}</span>
			<span class="text-muted-foreground text-xs">{m.imp_limits()}</span>
		{/if}
	</button>
	<input
		bind:this={input}
		type="file"
		accept=".csv,text/csv"
		class="hidden"
		onchange={(e) => choose(e.currentTarget.files?.[0])}
		data-testid="csv-input"
	/>

	<fieldset class="grid gap-2 sm:grid-cols-2" disabled={busy}>
		<legend class="mb-2 text-sm font-medium">{m.imp_mode()}</legend>
		{#each [{ value: 'CREATE_ONLY', label: m.imp_mode_create(), hint: m.imp_mode_create_hint() }, { value: 'UPSERT_BY_VACATION_NUMBER', label: m.imp_mode_upsert(), hint: m.imp_mode_upsert_hint() }] as option (option.value)}
			<label class="has-checked:border-primary has-checked:bg-primary/5 flex cursor-pointer gap-3 rounded-xl border p-3">
				<input
					type="radio"
					name="mode"
					value={option.value}
					bind:group={mode}
					onchange={runPreview}
					class="accent-primary mt-1"
				/>
				<span class="grid gap-0.5">
					<span class="text-sm font-medium">{option.label}</span>
					<span class="text-muted-foreground text-xs">{option.hint}</span>
				</span>
			</label>
		{/each}
	</fieldset>

	{#if busy && !preview}
		<p class="text-muted-foreground flex items-center gap-2 text-sm"><Spinner />{m.loading()}</p>
	{/if}

	{#if preview}
		<div class="flex flex-wrap items-center gap-4 text-sm">
			<span class="flex items-center gap-1.5 text-[var(--status-approved)]"><CircleCheck class="size-4" />{m.imp_valid({ count: preview.validRows.length })}</span>
			<span class="text-destructive flex items-center gap-1.5"><CircleX class="size-4" />{m.imp_invalid({ count: preview.invalidRows.length })}</span>
			{#if result}
				<Button class="ml-auto" href="/vacations">{m.imp_go_list()}</Button>
			{:else}
				<Button class="ml-auto" disabled={busy || preview.validRows.length === 0} onclick={runApply}>
					{#if applyImport.pending}<Spinner />{/if}
					{m.imp_apply({ count: preview.validRows.length })}
				</Button>
			{/if}
		</div>

		<div class="overflow-hidden rounded-xl border">
			<Table.Root>
				<Table.Header class="bg-muted/40">
					<Table.Row>
						<Table.Head class="w-16">{m.imp_row()}</Table.Head>
						<Table.Head>{m.imp_number()}</Table.Head>
						<Table.Head>{m.vac_col_vacation()}</Table.Head>
						<Table.Head>{m.vac_col_dates()}</Table.Head>
						<Table.Head>{m.vac_col_status()}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each rows as row (row.rowNumber)}
						{@const applyError = result?.errors[String(row.rowNumber)]}
						<Table.Row class={row.error || applyError ? 'bg-destructive/5' : ''}>
							<Table.Cell class="tabular-nums">{row.rowNumber}</Table.Cell>
							<Table.Cell class="font-mono text-xs">{row.vacationNumber ?? '—'}</Table.Cell>
							{#if row.request && !applyError}
								<Table.Cell class="max-w-64 truncate">{row.request.title}</Table.Cell>
								<Table.Cell class="whitespace-nowrap tabular-nums">{formatRange(row.request.startDate, row.request.endDate)}</Table.Cell>
								<Table.Cell><StatusBadge status={row.request.status} /></Table.Cell>
							{:else}
								<Table.Cell colspan={3} class="text-destructive">
									{localizeBackendMessage(row.error ?? applyError, 400)}
								</Table.Cell>
							{/if}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>
