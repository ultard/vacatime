<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Dices from '@lucide/svelte/icons/dices';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import CopyId from '#lib/components/app/copy-id.svelte';
	import type { UserDto } from '#lib/api/types.ts';
	import { listUsers, resetPassword } from '#lib/remote/admin.remote.ts';
	import { generatePassword } from '#lib/schemas/admin.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/utils/errors.ts';

	let { user = $bindable() }: { user: UserDto | null } = $props();
	let password = $state(generatePassword());
	let done = $state(false);

	$effect(() => {
		if (user) {
			password = generatePassword();
			done = false;
		}
	});

	async function submit() {
		if (!user) return;
		try {
			await resetPassword({ id: user.id, temporaryPassword: password }).updates(listUsers);
			done = true;
			toast.success(m.users_reset_done());
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}
</script>

<Dialog.Root open={!!user} onOpenChange={(open) => !open && (user = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.users_reset_title({ name: user?.fullName ?? '' })}</Dialog.Title>
			<Dialog.Description>{m.users_reset_desc()}</Dialog.Description>
		</Dialog.Header>
		{#if done}
			<div class="bg-muted grid justify-items-center gap-2 rounded-lg p-4">
				<span class="font-mono text-lg">{password}</span>
				<CopyId id={password} label={m.copy()} />
			</div>
		{:else}
			<div class="flex gap-2">
				<Input bind:value={password} class="font-mono" minlength={8} maxlength={72} aria-label={m.users_temp_password()} />
				<Button variant="outline" onclick={() => (password = generatePassword())}><Dices />{m.users_generate()}</Button>
			</div>
		{/if}
		<Dialog.Footer>
			{#if done}
				<Button onclick={() => (user = null)}>{m.close()}</Button>
			{:else}
				<Button variant="ghost" onclick={() => (user = null)}>{m.cancel()}</Button>
				<Button variant="destructive" disabled={password.length < 8 || resetPassword.pending > 0} onclick={submit}>
					{m.users_reset()}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
