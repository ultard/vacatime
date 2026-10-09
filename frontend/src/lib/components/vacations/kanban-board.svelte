<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Flame from '@lucide/svelte/icons/flame';
	import type { RemoteQuery } from '$app/server';
	import { VACATION_STATUSES, type VacationDto, type VacationStatus } from '#lib/api/types.ts';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import { changeStatus } from '#lib/remote/vacations.remote.ts';
	import { statusLabel } from '#lib/labels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatRange } from '#lib/utils/date.ts';
	import { errorInfo } from '#lib/utils/errors.ts';
	import { canMoveTo } from '#lib/utils/vacation.ts';

	let {
		query,
		vacations,
		editable,
		onopen
	}: {
		query: RemoteQuery<VacationDto[]>;
		vacations: VacationDto[];
		editable: boolean;
		onopen: (vacation: VacationDto) => void;
	} = $props();

	const PAGE = 25;
	let shown = $state<Record<string, number>>({});
	const columns = $derived(
		VACATION_STATUSES.map((status) => ({
			status,
			items: vacations.filter((v) => v.status === status)
		}))
	);

	// Drag state (pointer or keyboard)
	let dragging = $state<VacationDto | null>(null);
	let over = $state<VacationStatus | null>(null);
	let ghost = $state({ x: 0, y: 0, width: 0 });
	let offset = { x: 0, y: 0 };
	let start = { x: 0, y: 0 };
	let pending: VacationDto | null = null;
	let keyboardMode = $state(false);
	let announcement = $state('');

	async function move(vacation: VacationDto, status: VacationStatus) {
		if (!canMoveTo(vacation, status)) {
			if (status !== vacation.status) toast.error(m.board_not_allowed());
			return;
		}
		try {
			await changeStatus({ id: vacation.id, status, version: vacation.version }).updates(
				query.withOverride((list) => list.map((v) => (v.id === vacation.id ? { ...v, status } : v)))
			);
			toast.success(m.board_moved({ title: vacation.title, status: statusLabel(status) }));
		} catch (error) {
			const info = errorInfo(error);
			toast.error(info.code === 'VERSION_CONFLICT' ? m.vd_stale() : info.message);
			void query.refresh();
		}
	}

	function columnAt(x: number, y: number): VacationStatus | null {
		const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-column]');
		return (element?.dataset.column as VacationStatus) ?? null;
	}

	function onpointerdown(event: PointerEvent, vacation: VacationDto) {
		if (!editable || event.button !== 0) return;
		const card = event.currentTarget as HTMLElement;
		const rect = card.getBoundingClientRect();
		pending = vacation;
		start = { x: event.clientX, y: event.clientY };
		offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
		ghost = { x: rect.left, y: rect.top, width: rect.width };
		card.setPointerCapture(event.pointerId);
	}

	function onpointermove(event: PointerEvent) {
		if (!pending) return;
		if (!dragging && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return;
		dragging = pending;
		ghost = { ...ghost, x: event.clientX - offset.x, y: event.clientY - offset.y };
		over = columnAt(event.clientX, event.clientY);
	}

	function onpointerup(event: PointerEvent, vacation: VacationDto) {
		const wasDragging = dragging;
		const target = over;
		pending = null;
		dragging = null;
		over = null;
		if (wasDragging && target && target !== vacation.status) move(vacation, target);
		else if (!wasDragging && event.type === 'pointerup') onopen(vacation);
	}

	function onkeydown(event: KeyboardEvent, vacation: VacationDto) {
		if (event.key === 'Enter' && !keyboardMode) {
			onopen(vacation);
			return;
		}
		if (!editable) return;
		const index = VACATION_STATUSES.indexOf(over ?? vacation.status);
		if (event.key === ' ') {
			event.preventDefault();
			if (!keyboardMode) {
				keyboardMode = true;
				dragging = vacation;
				over = vacation.status;
				announcement = m.board_picked({ title: vacation.title });
			} else {
				const target = over;
				keyboardMode = false;
				dragging = null;
				over = null;
				if (target && target !== vacation.status) move(vacation, target);
			}
		} else if (keyboardMode && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
			event.preventDefault();
			const next = VACATION_STATUSES[(index + (event.key === 'ArrowRight' ? 1 : -1) + VACATION_STATUSES.length) % VACATION_STATUSES.length];
			over = next;
			announcement = statusLabel(next);
		} else if (keyboardMode && event.key === 'Escape') {
			keyboardMode = false;
			dragging = null;
			over = null;
		}
	}
</script>

<p class="sr-only" aria-live="assertive">{announcement}</p>

<div class="grid auto-cols-[minmax(16rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-4">
	{#each columns as column (column.status)}
		{@const allowed = !dragging || canMoveTo(dragging, column.status) || dragging.status === column.status}
		<section
			data-column={column.status}
			aria-label={statusLabel(column.status)}
			class="bg-muted/40 flex max-h-[calc(100dvh-14rem)] min-h-64 flex-col rounded-2xl border transition-[opacity,box-shadow]"
			class:opacity-40={dragging && !allowed}
			class:ring-2={over === column.status && allowed}
			class:ring-primary={over === column.status && allowed}
		>
			<header class="flex items-center gap-2 px-3 pt-3 pb-2">
				<span class="size-2.5 rounded-full" style:background="var(--status-{column.status.toLowerCase()})"></span>
				<h2 class="text-sm font-semibold">{statusLabel(column.status)}</h2>
				<span class="text-muted-foreground ml-auto text-xs tabular-nums">{column.items.length}</span>
			</header>
			<ul class="grid content-start gap-2 overflow-y-auto px-2 pb-2">
				{#each column.items.slice(0, shown[column.status] ?? PAGE) as vacation (vacation.id)}
					<li>
						<button
							type="button"
							class="bg-card hover:border-primary/50 focus-visible:ring-ring grid w-full touch-none gap-2 rounded-xl border p-3 text-left text-sm shadow-xs transition-[border-color,opacity] select-none focus-visible:ring-2 focus-visible:outline-none"
							class:opacity-30={dragging?.id === vacation.id && !keyboardMode}
							class:ring-2={keyboardMode && dragging?.id === vacation.id}
							class:cursor-grab={editable}
							aria-roledescription={editable ? 'draggable' : undefined}
							onpointerdown={(e) => onpointerdown(e, vacation)}
							onpointermove={onpointermove}
							onpointerup={(e) => onpointerup(e, vacation)}
							onpointercancel={() => {
								pending = null;
								dragging = null;
								over = null;
							}}
							onkeydown={(e) => onkeydown(e, vacation)}
						>
							<span class="flex items-start gap-1.5 font-medium">
								{#if vacation.urgent}<Flame class="text-sunset mt-0.5 size-3.5 shrink-0" />{/if}
								<span class="line-clamp-2">{vacation.title}</span>
							</span>
							<span class="text-muted-foreground flex items-center gap-1.5 text-xs">
								<UserAvatar name={vacation.employee.fullName} class="size-5 text-[9px]" />
								<span class="truncate">{vacation.employee.fullName}</span>
							</span>
							<span class="text-muted-foreground text-xs tabular-nums">
								{formatRange(vacation.startDate, vacation.endDate)} · {m.days_count({ count: vacation.daysCount })}
							</span>
							{#if vacation.tags.length}
								<span class="flex flex-wrap gap-1">
									{#each vacation.tags.slice(0, 3) as tag (tag)}
										<span class="bg-secondary rounded px-1.5 py-0.5 text-[10px]">{tag}</span>
									{/each}
								</span>
							{/if}
						</button>
					</li>
				{:else}
					<li class="text-muted-foreground py-6 text-center text-xs">{m.board_empty_column()}</li>
				{/each}
				{#if column.items.length > (shown[column.status] ?? PAGE)}
					<li>
						<button
							type="button"
							class="text-muted-foreground hover:text-foreground w-full py-2 text-xs"
							onclick={() => (shown[column.status] = (shown[column.status] ?? PAGE) + PAGE)}
						>
							{m.board_more({ count: column.items.length - (shown[column.status] ?? PAGE) })}
						</button>
					</li>
				{/if}
			</ul>
		</section>
	{/each}
</div>

{#if dragging && !keyboardMode}
	<div
		class="bg-card pointer-events-none fixed z-50 rotate-2 rounded-xl border p-3 text-sm font-medium shadow-2xl"
		style:left="{ghost.x}px"
		style:top="{ghost.y}px"
		style:width="{ghost.width}px"
	>
		{dragging.title}
		<span class="text-muted-foreground block text-xs">{dragging.employee.fullName}</span>
	</div>
{/if}
