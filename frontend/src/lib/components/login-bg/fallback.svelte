<script lang="ts">
	let { dark }: { dark: boolean } = $props();
</script>

<!-- Static backdrop for SSR and browsers where the canvas cannot run; matches the puzzle palette. -->
<div class="absolute inset-0" style:background={dark ? 'rgb(16 20 36)' : 'rgb(246 241 231)'}></div>
