<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import FieldError from '#lib/components/app/field-error.svelte';
	import type { VacationTypeDto } from '#lib/api/types.ts';
	import { saveVacationType } from '#lib/remote/admin.remote.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { type, onsaved }: { type?: VacationTypeDto; onsaved: () => void } = $props();

	// svelte-ignore state_referenced_locally
	const form = type ? saveVacationType.for(type.id) : saveVacationType;
	const { fields } = form;
	// svelte-ignore state_referenced_locally
	fields.set({
		code: type?.code ?? '',
		name: type?.name ?? '',
		description: type?.description ?? '',
		active: type?.active ?? true
	});
	const formIssues = $derived(fields.issues());

	const enhanced = form.enhance(async ({ submit }) => {
		await submit();
		if (form.result?.type) {
			toast.success(m.types_saved());
			onsaved();
		}
	});
</script>

<form {...enhanced} class="grid gap-4" novalidate>
	<div class="grid grid-cols-[8rem_1fr] gap-3">
		<div class="grid content-start gap-1.5">
			<Label for="t-code">{m.types_code()}</Label>
			<Input id="t-code" class="font-mono uppercase" {...fields.code.as('text')} />
			<FieldError issues={fields.code.issues()} />
		</div>
		<div class="grid content-start gap-1.5">
			<Label for="t-name">{m.types_name()}</Label>
			<Input id="t-name" {...fields.name.as('text')} />
			<FieldError issues={fields.name.issues()} />
		</div>
	</div>
	<div class="grid content-start gap-1.5">
		<Label for="t-desc">{m.types_description()}</Label>
		<Textarea id="t-desc" rows={3} maxlength={1000} {...fields.description.as('text')} />
		<FieldError issues={fields.description.issues()} />
	</div>
	<label class="flex items-start gap-3">
		<input class="accent-primary mt-0.5 size-4" {...fields.active.as('checkbox')} />
		<span class="grid gap-0.5">
			<span class="text-sm">{m.types_active()}</span>
			<span class="text-muted-foreground text-xs">{m.types_inactive_hint()}</span>
		</span>
	</label>
	{#if formIssues?.length}
		<div role="alert" class="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{formIssues[0].message}</div>
	{/if}
	<Button type="submit" disabled={form.pending > 0}>
		{#if form.pending}<Spinner />{/if}
		{type ? m.save() : m.create()}
	</Button>
</form>
