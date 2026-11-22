<script lang="ts">
	import { page } from '$app/state';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import { getVacation } from '#lib/remote/vacations.remote.ts';
	import { m } from '#lib/paraglide/messages.js';
	import VacationDetails from './vacation-details.svelte';

	/** Vacation shown via shallow routing (`page.state.vacationId`) on top of a list view. */
	const id = $derived(page.state.vacationId);

	function close() {
		history.back();
	}
</script>

<Sheet.Root open={!!id} onOpenChange={(open) => !open && close()}>
	<Sheet.Content class="w-full overflow-y-auto sm:max-w-xl">
		<Sheet.Header class="flex-row items-center gap-2 pr-10">
			<Sheet.Title class="sr-only">{m.vac_col_vacation()}</Sheet.Title>
			{#if id}
				<Button size="sm" variant="ghost" href="/vacations/{id}" data-sveltekit-reload={false}>
					<ExternalLink />{m.open_page()}
				</Button>
			{/if}
		</Sheet.Header>
		<div class="px-4 pb-8">
			{#if id}
				<svelte:boundary>
					{#snippet pending()}
						<div class="grid gap-3">
							<Skeleton class="h-6 w-24" />
							<Skeleton class="h-8 w-3/4" />
							<Skeleton class="h-40 w-full" />
						</div>
					{/snippet}
					{#snippet failed(error, reset)}
						<ErrorState {error} {reset} />
					{/snippet}
					<VacationDetails vacation={await getVacation(id)} ondeleted={close} />
				</svelte:boundary>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
