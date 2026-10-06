<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Dices from '@lucide/svelte/icons/dices';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import FieldError from '#lib/components/app/field-error.svelte';
	import { ROLES, type UserDto } from '#lib/api/types.ts';
	import { listUsers, saveUser } from '#lib/remote/admin.remote.ts';
	import { generatePassword } from '#lib/schemas/admin.ts';
	import { roleLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { user, onsaved }: { user?: UserDto; onsaved: () => void } = $props();

	// svelte-ignore state_referenced_locally
	const form = user ? saveUser.for(user.id) : saveUser;
	const { fields } = form;
	// svelte-ignore state_referenced_locally
	fields.set({
		login: user?.login ?? '',
		fullName: user?.fullName ?? '',
		roles: user?.roles ?? ['VIEWER'],
		active: user?.active ?? true,
		temporaryPassword: ''
	});

	const roleHints = { VIEWER: m.users_role_VIEWER_hint, EDITOR: m.users_role_EDITOR_hint, ADMIN: m.users_role_ADMIN_hint };
	const deactivating = $derived(!!user?.active && !fields.active.value());
	const formIssues = $derived(fields.issues());

	const enhanced = form.enhance(async ({ submit }) => {
		await submit().updates(listUsers);
		if (form.result?.user) {
			toast.success(m.users_saved());
			onsaved();
		}
	});
</script>

<form {...enhanced} class="grid gap-4" novalidate>
	<div class="grid content-start gap-1.5">
		<Label for="u-login">{m.users_login()}</Label>
		<Input id="u-login" autocomplete="off" autocapitalize="none" spellcheck={false} {...fields.login.as('text')} />
		<FieldError issues={fields.login.issues()} />
	</div>
	<div class="grid content-start gap-1.5">
		<Label for="u-name">{m.users_full_name()}</Label>
		<Input id="u-name" autocomplete="off" {...fields.fullName.as('text')} />
		<FieldError issues={fields.fullName.issues()} />
	</div>
	<fieldset class="grid gap-2">
		<legend class="mb-1.5 text-sm font-medium">{m.users_roles()}</legend>
		{#each ROLES as role (role)}
			<label class="has-checked:border-primary has-checked:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border p-3">
				<input class="accent-primary mt-0.5 size-4" {...fields.roles.as('checkbox', role)} />
				<span class="grid gap-0.5">
					<span class="text-sm font-medium">{roleLabel(role)}</span>
					<span class="text-muted-foreground text-xs">{roleHints[role]()}</span>
				</span>
			</label>
		{/each}
		<FieldError issues={fields.roles.issues()} />
	</fieldset>
	<label class="flex items-center gap-3">
		<input class="accent-primary size-4" {...fields.active.as('checkbox')} />
		<span class="text-sm">{m.users_active()}</span>
	</label>
	{#if deactivating}
		<p class="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
			<TriangleAlert class="mt-0.5 size-4 shrink-0" />{m.users_deactivate_warning()}
		</p>
	{/if}
	{#if !user}
		<div class="grid content-start gap-1.5">
			<Label for="u-pass">{m.users_temp_password()}</Label>
			<div class="flex gap-2">
				<Input id="u-pass" autocomplete="new-password" class="font-mono" {...fields.temporaryPassword.as('text')} />
				<Button type="button" variant="outline" onclick={() => fields.temporaryPassword.set(generatePassword())}>
					<Dices />{m.users_generate()}
				</Button>
			</div>
			<p class="text-muted-foreground text-xs">{m.users_temp_password_hint()}</p>
			<FieldError issues={fields.temporaryPassword.issues()} />
		</div>
	{/if}
	{#if formIssues?.length}
		<div role="alert" class="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{formIssues[0].message}</div>
	{/if}
	<Button type="submit" disabled={form.pending > 0}>
		{#if form.pending}<Spinner />{/if}
		{user ? m.save() : m.create()}
	</Button>
</form>
