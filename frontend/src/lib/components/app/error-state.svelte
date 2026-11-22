<script lang="ts">
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { errorInfo } from '#lib/utils/errors.ts';
	import CopyId from './copy-id.svelte';

	let { error, reset, compact = false }: { error: unknown; reset?: () => void; compact?: boolean } = $props();
	const info = $derived(errorInfo(error));
</script>

<div
	role="alert"
	class="border-destructive/30 bg-destructive/5 grid justify-items-center gap-2 rounded-xl border border-dashed text-center"
	class:p-8={!compact}
	class:p-4={compact}
>
	<TriangleAlert class="text-destructive size-6" />
	<p class="font-medium">{m.error_title()}</p>
	<p class="text-muted-foreground max-w-md text-sm">{info.message}</p>
	{#if info.correlationId}<CopyId id={info.correlationId} />{/if}
	<div class="flex gap-2">
		{#if info.status === 401}
			<Button size="sm" href="/login">{m.error_sign_in()}</Button>
		{:else if reset}
			<Button size="sm" variant="outline" onclick={reset}>{m.retry()}</Button>
		{/if}
	</div>
</div>
