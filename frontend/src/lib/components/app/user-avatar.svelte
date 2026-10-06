<script lang="ts">
	import { cn } from '#lib/utils/index.ts';

	let { name, class: className }: { name: string; class?: string } = $props();

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('')
	);
	// Stable hue per name so the same person always gets the same colour.
	const hue = $derived([...name].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360, 7));
</script>

<span
	class={cn('inline-grid shrink-0 place-items-center rounded-full text-xs font-semibold select-none', className)}
	style:background="oklch(0.86 0.07 {hue})"
	style:color="oklch(0.32 0.08 {hue})"
	aria-hidden="true"
>
	{initials}
</span>
