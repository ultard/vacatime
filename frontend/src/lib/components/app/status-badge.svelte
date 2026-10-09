<script lang="ts">
	import type { VacationStatus } from '#lib/api/types.ts';
	import { statusLabel } from '#lib/labels.ts';
	import { cn } from '#lib/utils/index.ts';

	let { status, class: className }: { status: VacationStatus; class?: string } = $props();
</script>

<span
	class={cn(
		'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
		className
	)}
	style:background="color-mix(in oklch, var(--status-{status.toLowerCase()}) 16%, transparent)"
	style:color="color-mix(in oklch, var(--status-{status.toLowerCase()}) 45%, var(--foreground))"
>
	<span class="size-1.5 rounded-full" style:background="var(--status-{status.toLowerCase()})"></span>
	{statusLabel(status)}
</span>
