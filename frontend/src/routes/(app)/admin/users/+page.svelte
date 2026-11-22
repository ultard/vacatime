<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Search from '@lucide/svelte/icons/search';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import Pager from '#lib/components/app/pager.svelte';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import UserForm from '#lib/components/admin/user-form.svelte';
	import ResetPasswordDialog from '#lib/components/admin/reset-password-dialog.svelte';
	import type { UserDto } from '#lib/api/types.ts';
	import { listUsers } from '#lib/remote/admin.remote.ts';
	import { getUser } from '#lib/context.ts';
	import { roleLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';

	const me = getUser();
	const pageNumber = $derived(Math.max(0, Number(page.url.searchParams.get('page')) || 0));
	const size = $derived([20, 50, 100].includes(Number(page.url.searchParams.get('size'))) ? Number(page.url.searchParams.get('size')) : 20);
	const query = $derived(listUsers({ page: pageNumber, size }));

	let search = $state('');
	let editing = $state<UserDto | 'new' | null>(null);
	let resetting = $state<UserDto | null>(null);

	const matches = (u: UserDto) => {
		const q = search.trim().toLowerCase();
		return !q || u.login.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q);
	};

	function go(params: { page?: number; size?: number }) {
		const s = new URLSearchParams({ page: String(params.page ?? pageNumber), size: String(params.size ?? size) });
		goto(`/admin/users?${s}`, { replace: true, reset: false });
	}
</script>

<svelte:head><title>{m.users_title()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-5 py-6">
	<div class="flex flex-wrap items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{m.users_title()}</h1>
		<Button class="ml-auto" onclick={() => (editing = 'new')}><Plus />{m.users_new()}</Button>
	</div>
	<div class="relative max-w-sm">
		<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
		<Input type="search" class="pl-9" placeholder={m.users_search()} bind:value={search} title={m.users_search_hint()} />
	</div>

	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-96 w-full" />{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		{@const result = await query}
		<div class="@container overflow-hidden rounded-xl border">
			<Table.Root>
				<Table.Header class="bg-muted/40">
					<Table.Row>
						<Table.Head>{m.users_col_user()}</Table.Head>
						<Table.Head>{m.users_col_roles()}</Table.Head>
						<Table.Head class="hidden @xl:table-cell">{m.users_col_state()}</Table.Head>
						<Table.Head class="w-24"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each result.content.filter(matches) as user (user.id)}
						<Table.Row class={user.active ? '' : 'bg-muted/40'}>
							<Table.Cell>
								<span class="flex items-center gap-3">
									<UserAvatar name={user.fullName} class="size-8" />
									<span class="grid">
										<span class="font-medium">
											{user.fullName}
											{#if user.id === me().id}<span class="text-muted-foreground text-xs">({m.users_you()})</span>{/if}
										</span>
										<span class="text-muted-foreground text-xs">@{user.login}</span>
									</span>
								</span>
							</Table.Cell>
							<Table.Cell>
								<span class="flex flex-wrap gap-1">
									{#each user.roles as role (role)}
										<span class="rounded-full px-2 py-0.5 text-xs" class:bg-primary={role === 'ADMIN'} class:text-primary-foreground={role === 'ADMIN'} class:bg-secondary={role !== 'ADMIN'}>
											{roleLabel(role)}
										</span>
									{/each}
								</span>
							</Table.Cell>
							<Table.Cell class="hidden text-sm @xl:table-cell">
								<span class="grid">
									<span>{user.active ? m.active() : m.inactive()}</span>
									{#if user.mustChangePassword}<span class="text-muted-foreground text-xs">{m.users_must_change()}</span>{/if}
								</span>
							</Table.Cell>
							<Table.Cell>
								<span class="flex justify-end gap-1">
									<Button size="icon" variant="ghost" aria-label={m.users_reset()} title={m.users_reset()} onclick={() => (resetting = user)}>
										<KeyRound />
									</Button>
									<Button size="icon" variant="ghost" aria-label={m.edit()} onclick={() => (editing = user)}>
										<Pencil />
									</Button>
								</span>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
		<Pager page={result.page} totalPages={result.totalPages} {size} onpage={(p) => go({ page: p })} onsize={(s) => go({ page: 0, size: s })} />
	</svelte:boundary>
</div>

<Sheet.Root open={!!editing} onOpenChange={(open) => !open && (editing = null)}>
	<Sheet.Content class="w-full overflow-y-auto sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title>{editing === 'new' ? m.users_new() : m.users_edit()}</Sheet.Title>
		</Sheet.Header>
		<div class="px-4 pb-6">
			{#if editing}
				{#key editing === 'new' ? 'new' : editing.id}
					<UserForm user={editing === 'new' ? undefined : editing} onsaved={() => (editing = null)} />
				{/key}
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>

<ResetPasswordDialog bind:user={resetting} />
