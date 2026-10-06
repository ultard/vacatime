<script lang="ts">
	import { page } from '$app/state';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import VacationDetails from '#lib/components/vacations/vacation-details.svelte';
	import { getVacation } from '#lib/remote/vacations.remote.ts';
	import { m } from '#lib/paraglide/messages.js';

	const vacation = $derived(getVacation(page.params.id!));
</script>

<svelte:head><title>{vacation.current?.title ?? m.vac_col_vacation()} · {m.app_name()}</title></svelte:head>

<div class="mx-auto grid max-w-3xl gap-4 py-6">
	<Button variant="ghost" size="sm" href="/vacations" class="w-fit"><ArrowLeft />{m.vac_title()}</Button>
	<svelte:boundary>
		{#snippet pending()}
			<div class="grid gap-3">
				<Skeleton class="h-6 w-24" />
				<Skeleton class="h-9 w-2/3" />
				<Skeleton class="h-64 w-full" />
			</div>
		{/snippet}
		{#snippet failed(error, reset)}
			<ErrorState {error} {reset} />
		{/snippet}
		<div class="bg-card rounded-2xl border p-6 shadow-sm">
			<VacationDetails vacation={await vacation} />
		</div>
	</svelte:boundary>
</div>
