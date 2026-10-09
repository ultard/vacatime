<script lang="ts">
	import mark from '#lib/assets/favicon.svg';

	let { class: className = 'size-8' }: { class?: string } = $props();
</script>

<!-- The same hand-drawn mark as the favicon: a tear-off calendar page with a sunset over the sea. -->
<img src={mark} alt="" class={className} draggable="false" />
