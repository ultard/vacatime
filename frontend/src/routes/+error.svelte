<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import Logo from '#lib/components/app/logo.svelte';
	import CopyId from '#lib/components/app/copy-id.svelte';
	import { m } from '#lib/paraglide/messages.js';

	const status = $derived(page.status);
	const title = $derived(
		status === 404 ? m.not_found_title() : status === 403 ? m.forbidden_title() : m.error_page_title({ status })
	);
</script>

<svelte:head><title>{title} · {m.app_name()}</title></svelte:head>

<main class="grid min-h-dvh place-items-center p-6">
	<div class="grid max-w-md justify-items-center gap-4 text-center">
		<Logo class="size-14" />
		<p class="text-muted-foreground font-mono text-sm">{status}</p>
		<h1 class="text-3xl font-semibold tracking-tight">{title}</h1>
		{#if page.error?.message && status !== 404}
			<p class="text-muted-foreground">{page.error.message}</p>
		{/if}
		{#if page.error?.correlationId}
			<CopyId id={page.error.correlationId} />
		{/if}
		<div class="flex gap-2">
			{#if status === 401}
				<Button href="/login">{m.error_sign_in()}</Button>
			{:else}
				<Button href="/">{m.error_go_home()}</Button>
			{/if}
		</div>
	</div>
</main>
