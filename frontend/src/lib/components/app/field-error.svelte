<script lang="ts">
	let { issues }: { issues: { message: string }[] | undefined } = $props();
</script>

{#if issues?.length}
	<p class="text-destructive text-xs" role="alert">{issues[0].message}</p>
{/if}
