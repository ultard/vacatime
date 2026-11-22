<script lang="ts">
	import { page } from '$app/state';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import VacationForm from '#lib/components/vacations/vacation-form.svelte';
	import { getVacation } from '#lib/remote/vacations.remote.ts';
	import { listEmployees, listVacationTypes } from '#lib/remote/dictionaries.remote.ts';
	import { m } from '#lib/paraglide/messages.js';

	const id = $derived(page.params.id!);
</script>

<svelte:head><title>{m.vf_edit_title()} · {m.app_name()}</title></svelte:head>

<div class="mx-auto grid max-w-2xl gap-4 py-6">
	<Button variant="ghost" size="sm" href="/vacations/{id}" class="w-fit"><ArrowLeft />{m.back()}</Button>
	<h1 class="text-2xl font-semibold tracking-tight">{m.vf_edit_title()}</h1>
	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-96 w-full" />{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		{@const employees = await listEmployees()}
		{#key id}
			<VacationForm
				vacation={await getVacation(id)}
				types={await listVacationTypes()}
				employees={employees.employees}
				employeesComplete={employees.complete}
			/>
		{/key}
	</svelte:boundary>
</div>
