<script lang="ts">
	import SignalLow from '@lucide/svelte/icons/signal-low';
	import SignalMedium from '@lucide/svelte/icons/signal-medium';
	import SignalHigh from '@lucide/svelte/icons/signal-high';
	import type { VacationPriority } from '#lib/api/types.ts';
	import { priorityLabel } from '#lib/labels.ts';

	let { priority }: { priority: VacationPriority } = $props();
	const Icon = $derived({ LOW: SignalLow, NORMAL: SignalMedium, HIGH: SignalHigh }[priority]);
</script>

<span
	class="inline-flex items-center gap-1 text-xs whitespace-nowrap"
	class:text-muted-foreground={priority !== 'HIGH'}
	class:text-sunset={priority === 'HIGH'}
>
	<Icon class="size-3.5" />
	{priorityLabel(priority)}
</span>
