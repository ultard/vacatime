<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import { parseDate, type DateValue } from '@internationalized/date';
	import type { DateRange } from 'bits-ui';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { m } from '#lib/paraglide/messages.js';
	import { formatRange, inclusiveDays, intlLocale } from '#lib/utils/date.ts';
	import { cn } from '#lib/utils/index.ts';

	let {
		start = $bindable(''),
		end = $bindable(''),
		id,
		invalid = false,
		minValue,
		onchange
	}: {
		start?: string;
		end?: string;
		id?: string;
		invalid?: boolean;
		minValue?: string;
		onchange?: (start: string, end: string) => void;
	} = $props();

	let open = $state(false);
	const toValue = (iso: string): DateValue | undefined => (iso ? parseDate(iso) : undefined);

	let range = $state<DateRange>({ start: toValue(start), end: toValue(end) });
	$effect.pre(() => {
		range = { start: toValue(start), end: toValue(end) };
	});

	function update(next: DateRange) {
		if (next.start && next.end) {
			start = next.start.toString();
			end = next.end.toString();
			onchange?.(start, end);
			open = false;
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				{id}
				variant="outline"
				aria-invalid={invalid}
				class={cn('w-full justify-start gap-2 font-normal', !start && 'text-muted-foreground')}
			>
				<CalendarDays class="opacity-60" />
				{#if start && end}
					<span class="truncate">{formatRange(start, end)}</span>
					<span class="text-muted-foreground ml-auto text-xs tabular-nums">
						{m.days_count({ count: inclusiveDays(start, end) })}
					</span>
				{:else}
					{m.date_pick()}
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0" align="start">
		<RangeCalendar
			bind:value={range}
			onValueChange={update}
			numberOfMonths={2}
			locale={intlLocale()}
			weekStartsOn={1}
			minValue={minValue ? parseDate(minValue) : undefined}
			placeholder={range.start}
		/>
	</Popover.Content>
</Popover.Root>
