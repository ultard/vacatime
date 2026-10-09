<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import Logo from '#lib/components/app/logo.svelte';
	import AuthCard from '#lib/components/app/auth-card.svelte';
	import FieldError from '#lib/components/app/field-error.svelte';
	import LoginBackground from '#lib/components/login-bg/login-background.svelte';
	import type { Mood } from '#lib/components/login-bg/types.ts';
	import { changePassword, getMe, logout } from '#lib/remote/auth.remote.ts';
	import { passwordStrength } from '#lib/schemas/auth.ts';
	import { m } from '#lib/paraglide/messages.js';

	const me = $derived(await getMe());
	let mood = $state<Mood>('idle');

	const strength = $derived(passwordStrength(String(changePassword.fields.newPassword.value() ?? '')));
	const strengthLabels = [m.cp_strength_0, m.cp_strength_1, m.cp_strength_2, m.cp_strength_3, m.cp_strength_4];
	const formIssues = $derived(changePassword.fields.issues());

	const enhanced = changePassword.enhance(async ({ submit }) => {
		mood = 'idle';
		await submit();
		if (changePassword.result?.next) {
			mood = 'success';
			toast.success(m.cp_done());
			await new Promise((resolve) => setTimeout(resolve, 700));
			document.documentElement.classList.add('vt-sunrise');
			await goto(changePassword.result.next, { replace: true });
			setTimeout(() => document.documentElement.classList.remove('vt-sunrise'), 1000);
		} else {
			mood = 'error';
		}
	});
</script>

<svelte:head><title>{m.cp_title()} · {m.app_name()}</title></svelte:head>

<LoginBackground {mood} />

<main class="grid min-h-dvh place-items-center p-4">
	<AuthCard>
		<div class="mb-6 grid justify-items-center gap-3 text-center">
			<Logo class="size-12" />
			<h1 class="text-2xl font-semibold tracking-tight">{m.cp_title()}</h1>
			<p class="text-muted-foreground text-sm text-balance">
				{me?.mustChangePassword ? m.cp_subtitle() : m.cp_subtitle_voluntary()}
			</p>
		</div>
		<form {...enhanced} class="grid gap-4" novalidate oninput={() => mood !== 'success' && (mood = 'typing')}>
			<input type="text" autocomplete="username" value={me?.login ?? ''} class="hidden" readonly />
			<div class="grid gap-1.5">
				<Label for="oldPassword">{m.cp_old()}</Label>
				<Input id="oldPassword" autocomplete="current-password" {...changePassword.fields.oldPassword.as('password')} />
				<FieldError issues={changePassword.fields.oldPassword.issues()} />
			</div>
			<div class="grid gap-1.5">
				<Label for="newPassword">{m.cp_new()}</Label>
				<Input id="newPassword" autocomplete="new-password" {...changePassword.fields.newPassword.as('password')} />
				<div class="flex items-center gap-2" aria-live="polite">
					<div class="grid flex-1 grid-cols-4 gap-1">
						{#each [1, 2, 3, 4] as level (level)}
							<span
								class="h-1 rounded-full transition-colors duration-300"
								class:bg-muted={strength < level}
								style:background={strength >= level
									? ['', 'var(--status-rejected)', 'var(--status-pending)', 'var(--chart-1)', 'var(--status-approved)'][strength]
									: undefined}
							></span>
						{/each}
					</div>
					<span class="text-muted-foreground w-24 text-right text-xs">{strengthLabels[strength]()}</span>
				</div>
				<FieldError issues={changePassword.fields.newPassword.issues()} />
			</div>
			<div class="grid gap-1.5">
				<Label for="confirmPassword">{m.cp_confirm()}</Label>
				<Input
					id="confirmPassword"
					autocomplete="new-password"
					{...changePassword.fields.confirmPassword.as('password')}
				/>
				<FieldError issues={changePassword.fields.confirmPassword.issues()} />
			</div>
			<p class="text-muted-foreground text-xs">{m.cp_hint()}</p>
			{#if formIssues?.length}
				<div role="alert" class="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
					{formIssues[0].message}
				</div>
			{/if}
			<Button type="submit" size="lg" disabled={!!changePassword.pending || mood === 'success'}>
				{#if changePassword.pending}<Spinner />{/if}
				{m.cp_submit()}
			</Button>
		</form>
		<form {...logout} class="mt-4 text-center">
			<Button type="submit" variant="link" size="sm" class="text-muted-foreground">{m.logout()}</Button>
		</form>
	</AuthCard>
</main>
