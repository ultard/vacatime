<script lang="ts">
	import Languages from '@lucide/svelte/icons/languages';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, setLocale } from '#lib/paraglide/runtime.js';

	const next = $derived(getLocale() === 'ru' ? 'en' : 'ru');
</script>

<Button
	variant="ghost"
	size="sm"
	class="gap-1.5 font-medium uppercase"
	aria-label={m.language_label()}
	title={m.cmd_switch_language()}
	onclick={() => setLocale(next)}
>
	<Languages class="size-4" />
	{getLocale()}
</Button>
