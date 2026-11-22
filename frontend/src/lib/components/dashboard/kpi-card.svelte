<script lang="ts">
	import type { Component } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { formatNumber } from '#lib/utils/date.ts';

	let {
		label,
		value,
		icon: Icon,
		suffix = '',
		digits = 0,
		href
	}: { label: string; value: number; icon: Component; suffix?: string; digits?: number; href?: string } = $props();

	const tween = Tween.of(() => value, { duration: 900, easing: cubicOut });
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class="reveal bg-card hover:border-primary/40 grid gap-3 rounded-2xl border p-4 shadow-xs transition-colors"
>
	<span class="text-muted-foreground flex items-center gap-2 text-sm">
		<Icon class="size-4" />
		{label}
	</span>
	<span class="text-3xl font-semibold tracking-tight tabular-nums">{formatNumber(tween.current, digits)}{suffix}</span>
</svelte:element>
