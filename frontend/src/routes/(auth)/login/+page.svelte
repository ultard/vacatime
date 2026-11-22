<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import Logo from '#lib/components/app/logo.svelte';
	import AuthCard from '#lib/components/app/auth-card.svelte';
	import FieldError from '#lib/components/app/field-error.svelte';
	import LoginBackground from '#lib/components/login-bg/login-background.svelte';
	import type { Mood } from '#lib/components/login-bg/types.ts';
	import { login } from '#lib/remote/auth.remote.ts';
	import { m } from '#lib/paraglide/messages.js';

	let mood = $state<Mood>('idle');
	let showPassword = $state(false);
	let capsLock = $state(false);
	let typingTimer: ReturnType<typeof setTimeout> | undefined;

	function onInput() {
		if (mood === 'success') return;
		mood = 'typing';
		clearTimeout(typingTimer);
		typingTimer = setTimeout(() => (mood = 'idle'), 1200);
	}

	const formIssues = $derived(login.fields.issues());
	const enhanced = login.enhance(async ({ submit }) => {
		clearTimeout(typingTimer);
		mood = 'idle';
		await submit();
		const next = login.result?.next;
		if (!next) {
			mood = 'error';
			return;
		}
		mood = 'success';
		await new Promise((resolve) => setTimeout(resolve, 900));
		document.documentElement.classList.add('vt-sunrise');
		await goto(next, { replace: true });
		setTimeout(() => document.documentElement.classList.remove('vt-sunrise'), 1000);
	});
</script>

<svelte:head><title>{m.login_submit()} · {m.app_name()}</title></svelte:head>

<LoginBackground {mood} />

<main class="grid min-h-dvh place-items-center p-4">
	<AuthCard>
		<div class="mb-6 grid justify-items-center gap-3 text-center">
			<Logo class="size-12 drop-shadow" />
			<h1 class="text-2xl font-semibold tracking-tight">
				{mood === 'success' ? m.login_success() : m.login_title()}
			</h1>
			<p class="text-muted-foreground text-sm text-balance">{m.login_subtitle()}</p>
		</div>

		<form {...enhanced} class="grid gap-4" oninput={onInput} novalidate>
			<input {...login.fields.next.as('hidden', page.url.searchParams.get('next') ?? '/')} />
			<div class="grid gap-1.5">
				<Label for="login">{m.login_field_login()}</Label>
				<Input
					id="login"
					autocomplete="username"
					autocapitalize="none"
					spellcheck={false}
					required
					{...login.fields.login.as('text')}
				/>
				<FieldError issues={login.fields.login.issues()} />
			</div>
			<div class="grid gap-1.5">
				<Label for="password">{m.login_field_password()}</Label>
				<div class="relative">
					<Input
						id="password"
						autocomplete="current-password"
						required
						class="pr-10"
						onkeyup={(e: KeyboardEvent) => (capsLock = e.getModifierState?.('CapsLock') ?? false)}
						{...login.fields.password.as(showPassword ? 'text' : 'password')}
					/>
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 grid w-10 place-items-center"
						aria-label={showPassword ? m.login_hide_password() : m.login_show_password()}
						onclick={() => (showPassword = !showPassword)}
					>
						{#if showPassword}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
					</button>
				</div>
				{#if capsLock}
					<p class="text-xs text-amber-600 dark:text-amber-400">{m.login_caps_lock()}</p>
				{/if}
				<FieldError issues={login.fields.password.issues()} />
			</div>

			{#if formIssues?.length}
				<div role="alert" class="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
					{formIssues[0].message}
				</div>
			{/if}

			<Button type="submit" size="lg" class="mt-1 w-full" disabled={!!login.pending || mood === 'success'}>
				{#if login.pending || mood === 'success'}
					<Spinner />
					{m.login_submitting()}
				{:else}
					{m.login_submit()}
					<ArrowRight />
				{/if}
			</Button>
		</form>
		<p class="text-muted-foreground mt-6 text-center text-xs">{m.login_footer()}</p>
	</AuthCard>
</main>
