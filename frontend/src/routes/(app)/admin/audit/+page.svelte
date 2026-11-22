<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Search from '@lucide/svelte/icons/search';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import EmptyState from '#lib/components/app/empty-state.svelte';
	import Pager from '#lib/components/app/pager.svelte';
	import CopyId from '#lib/components/app/copy-id.svelte';
	import NativeSelect from '#lib/components/app/native-select.svelte';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import { listAudit } from '#lib/remote/admin.remote.ts';
	import { listEmployees } from '#lib/remote/dictionaries.remote.ts';
	import { entityLabel, eventLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/utils/date.ts';

	type Sort = 'createdAt' | 'eventType' | 'entityType';
	const params = $derived({
		search: page.url.searchParams.get('q') ?? '',
		page: Math.max(0, Number(page.url.searchParams.get('page')) || 0),
		size: [25, 50, 100].includes(Number(page.url.searchParams.get('size'))) ? Number(page.url.searchParams.get('size')) : 25,
		sort: (['createdAt', 'eventType', 'entityType'] as const).find((s) => s === page.url.searchParams.get('sort')) ?? 'createdAt',
		direction: page.url.searchParams.get('dir') === 'ASC' ? ('ASC' as const) : ('DESC' as const)
	});
	const query = $derived(listAudit(params));
	const people = listEmployees();

	let search = $state('');
	$effect.pre(() => {
		search = params.search;
	});
	let timer: ReturnType<typeof setTimeout>;

	function update(patch: Partial<typeof params>) {
		const next = { ...params, page: 0, ...patch };
		const s = new URLSearchParams();
		if (next.search) s.set('q', next.search);
		if (next.page) s.set('page', String(next.page));
		if (next.size !== 25) s.set('size', String(next.size));
		if (next.sort !== 'createdAt') s.set('sort', next.sort);
		if (next.direction !== 'DESC') s.set('dir', next.direction);
		goto(`/admin/audit${s.size ? `?${s}` : ''}`, { replace: true, reset: false });
	}

	let sortValue = $derived<Sort>(params.sort);
</script>

<svelte:head><title>{m.audit_title()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-5 py-6">
	<h1 class="text-2xl font-semibold tracking-tight">{m.audit_title()}</h1>
	<div class="flex flex-wrap gap-2">
		<div class="relative min-w-64 flex-1">
			<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
			<Input
				type="search"
				class="pl-9"
				placeholder={m.audit_search()}
				bind:value={search}
				oninput={() => {
					clearTimeout(timer);
					timer = setTimeout(() => update({ search }), 300);
				}}
			/>
		</div>
		<NativeSelect
			class="w-44"
			bind:value={sortValue}
			aria-label={m.vac_sort_label()}
			options={[
				{ value: 'createdAt', label: m.audit_sort_time() },
				{ value: 'eventType', label: m.audit_sort_event() },
				{ value: 'entityType', label: m.audit_sort_entity() }
			]}
			onchange={() => update({ sort: sortValue })}
		/>
		<Button
			variant="outline"
			size="icon"
			aria-label={params.direction}
			title={params.direction === 'DESC' ? '↓' : '↑'}
			onclick={() => update({ direction: params.direction === 'DESC' ? 'ASC' : 'DESC' })}
		>
			<ArrowUpDown />
		</Button>
	</div>

	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-96 w-full" />{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		{@const result = await query}
		{@const names = new Map((await people).employees.map((p) => [p.id, p.fullName]))}
		{#if result.content.length === 0}
			<EmptyState icon={ScrollText} title={m.audit_empty()} />
		{:else}
			<div class="@container overflow-hidden rounded-xl border" class:opacity-60={query.loading}>
				<Table.Root>
					<Table.Header class="bg-muted/40">
						<Table.Row>
							<Table.Head>{m.audit_col_time()}</Table.Head>
							<Table.Head>{m.audit_col_user()}</Table.Head>
							<Table.Head>{m.audit_col_event()}</Table.Head>
							<Table.Head>{m.audit_col_entity()}</Table.Head>
							<Table.Head class="hidden @3xl:table-cell">{m.audit_col_request()}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each result.content as entry (entry.id)}
							<Table.Row>
								<Table.Cell class="text-muted-foreground whitespace-nowrap tabular-nums">{formatDateTime(entry.createdAt)}</Table.Cell>
								<Table.Cell>
									{#if entry.userId}
										{@const name = names.get(entry.userId) ?? m.audit_unknown_user({ id: entry.userId.slice(0, 8) })}
										<span class="flex items-center gap-2">
											<UserAvatar {name} class="size-6 text-[10px]" />
											<span class="truncate">{name}</span>
										</span>
									{:else}
										<span class="text-muted-foreground">{m.audit_system()}</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<span class="grid">
										<span class:text-destructive={entry.eventType === 'LOGIN_FAILED'}>{eventLabel(entry.eventType)}</span>
										{#if entry.description}<span class="text-muted-foreground text-xs">{entry.description}</span>{/if}
									</span>
								</Table.Cell>
								<Table.Cell>
									<span class="grid">
										<span>{entityLabel(entry.entityType)}</span>
										{#if entry.entityId}
											{#if entry.entityType === 'VACATION' && entry.eventType !== 'PERMANENT_DELETE'}
												<a class="text-primary font-mono text-xs hover:underline" href="/vacations/{entry.entityId}">{entry.entityId.slice(0, 8)}…</a>
											{:else}
												<span class="text-muted-foreground font-mono text-xs">{entry.entityId.slice(0, 8)}…</span>
											{/if}
										{/if}
									</span>
								</Table.Cell>
								<Table.Cell class="hidden @3xl:table-cell"><CopyId id={entry.correlationId} label={entry.correlationId.slice(0, 13)} /></Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
			<Pager page={result.page} totalPages={result.totalPages} size={params.size} sizes={[25, 50, 100]} onpage={(p) => update({ page: p })} onsize={(size) => update({ size })} />
		{/if}
	</svelte:boundary>
</div>
