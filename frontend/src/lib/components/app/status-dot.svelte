<script lang="ts">
	import type { VacationStatus } from '#lib/api/types.ts';
	import { statusLabel } from '#lib/labels.ts';

	let { status }: { status: VacationStatus } = $props();
</script>

<span
	class="inline-block size-2 shrink-0 rounded-full"
	style:background="var(--status-{status.toLowerCase()})"
	title={statusLabel(status)}
></span>
