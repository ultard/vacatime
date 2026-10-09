<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Pin from '@lucide/svelte/icons/pin';
	import PinOff from '@lucide/svelte/icons/pin-off';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash from '@lucide/svelte/icons/trash-2';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import UserAvatar from '#lib/components/app/user-avatar.svelte';
	import ConfirmDialog from '#lib/components/app/confirm-dialog.svelte';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import type { NoteDto } from '#lib/api/types.ts';
	import { deleteNote, listNotes, saveNote } from '#lib/remote/vacations.remote.ts';
	import { getUser } from '#lib/context.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/utils/date.ts';
	import { errorMessage } from '#lib/utils/errors.ts';

	let { vacationId }: { vacationId: string } = $props();
	const user = getUser();
	const notes = $derived(listNotes(vacationId));

	let text = $state('');
	let pinned = $state(false);
	let editing = $state<string | null>(null);
	let editText = $state('');
	let toDelete = $state<NoteDto | null>(null);

	const sortNotes = (list: NoteDto[]) =>
		[...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

	async function add() {
		const value = text.trim();
		if (!value) return;
		const me = user();
		const optimistic: NoteDto = {
			id: crypto.randomUUID(),
			author: me,
			text: value,
			pinned,
			createdAt: new Date().toISOString()
		};
		text = '';
		try {
			await saveNote({ vacationId, text: value, pinned }).updates(
				notes.withOverride((list) => sortNotes([optimistic, ...list]))
			);
			pinned = false;
		} catch (error) {
			text = value;
			toast.error(errorMessage(error));
		}
	}

	async function update(note: NoteDto, patch: Partial<Pick<NoteDto, 'text' | 'pinned'>>) {
		const next = { ...note, ...patch };
		try {
			await saveNote({ vacationId, noteId: note.id, text: next.text, pinned: next.pinned }).updates(
				notes.withOverride((list) => sortNotes(list.map((n) => (n.id === note.id ? next : n))))
			);
			editing = null;
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}

	async function remove(note: NoteDto) {
		try {
			await deleteNote({ vacationId, noteId: note.id }).updates(
				notes.withOverride((list) => list.filter((n) => n.id !== note.id))
			);
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}
</script>

<section class="grid gap-3" aria-labelledby="notes-heading">
	<h3 id="notes-heading" class="text-sm font-semibold">{m.notes_title()}</h3>

	{#if user().canEdit}
		<form
			class="grid gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				add();
			}}
		>
			<Textarea
				bind:value={text}
				placeholder={m.notes_placeholder()}
				maxlength={4000}
				rows={2}
				class="field-sizing-content min-h-16 resize-none"
				onkeydown={(event: KeyboardEvent) => {
					if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) add();
				}}
			/>
			<div class="flex items-center justify-between">
				<Button
					type="button"
					size="sm"
					variant={pinned ? 'secondary' : 'ghost'}
					aria-pressed={pinned}
					onclick={() => (pinned = !pinned)}
				>
					<Pin />{m.notes_pin()}
				</Button>
				<Button type="submit" size="sm" disabled={!text.trim()}>{m.notes_add()}</Button>
			</div>
		</form>
	{/if}

	<svelte:boundary>
		{#snippet pending()}
			<Skeleton class="h-16 w-full" />
		{/snippet}
		{#snippet failed(error, reset)}
			<ErrorState {error} {reset} compact />
		{/snippet}
		{@const list = await notes}
		{#if !list.length}
			<p class="text-muted-foreground text-sm">{m.notes_empty()}</p>
		{/if}
		<ul class="grid gap-2">
			{#each list as note (note.id)}
				<li
					class="group bg-muted/40 rounded-xl border p-3 text-sm"
					class:border-primary={note.pinned}
					class:bg-primary={false}
				>
					<div class="mb-1.5 flex items-center gap-2">
						<UserAvatar name={note.author.fullName} class="size-6 text-[10px]" />
						<span class="font-medium">{note.author.fullName}</span>
						<span class="text-muted-foreground text-xs">{formatDateTime(note.createdAt)}</span>
						{#if note.pinned}<Pin class="text-primary size-3.5" aria-label={m.notes_pinned()} />{/if}
						{#if user().canEdit}
							<span class="ml-auto flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
								<Button
									size="icon"
									variant="ghost"
									class="size-7"
									aria-label={note.pinned ? m.notes_unpin() : m.notes_pin()}
									onclick={() => update(note, { pinned: !note.pinned })}
								>
									{#if note.pinned}<PinOff />{:else}<Pin />{/if}
								</Button>
								<Button
									size="icon"
									variant="ghost"
									class="size-7"
									aria-label={m.edit()}
									onclick={() => {
										editing = note.id;
										editText = note.text;
									}}
								>
									<Pencil />
								</Button>
								<Button size="icon" variant="ghost" class="size-7" aria-label={m.delete()} onclick={() => (toDelete = note)}>
									<Trash />
								</Button>
							</span>
						{/if}
					</div>
					{#if editing === note.id}
						<form
							class="grid gap-2"
							onsubmit={(event) => {
								event.preventDefault();
								if (editText.trim()) update(note, { text: editText.trim() });
							}}
						>
							<Textarea bind:value={editText} maxlength={4000} class="field-sizing-content min-h-16" />
							<div class="flex justify-end gap-2">
								<Button size="sm" variant="ghost" type="button" onclick={() => (editing = null)}>{m.cancel()}</Button>
								<Button size="sm" type="submit">{m.save()}</Button>
							</div>
						</form>
					{:else}
						<p class="whitespace-pre-wrap">{note.text}</p>
					{/if}
				</li>
			{/each}
		</ul>
	</svelte:boundary>
</section>

<ConfirmDialog
	bind:open={() => !!toDelete, (open) => !open && (toDelete = null)}
	title={m.notes_delete_confirm()}
	confirmLabel={m.delete()}
	destructive
	onconfirm={() => toDelete && remove(toDelete)}
/>
