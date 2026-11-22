<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Power from '@lucide/svelte/icons/power';
	import Info from '@lucide/svelte/icons/info';
	import Building from '@lucide/svelte/icons/building-2';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import ErrorState from '#lib/components/app/error-state.svelte';
	import EmptyState from '#lib/components/app/empty-state.svelte';
	import InlineName from '#lib/components/admin/inline-name.svelte';
	import type { DepartmentDto, ShiftDto } from '#lib/api/types.ts';
	import { listAdminDepartments, saveDepartment, saveShift } from '#lib/remote/admin.remote.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/utils/errors.ts';

	const departments = listAdminDepartments();
	/** Which inline editor is open: "new", "dep:<id>", "shift:<id>", "add:<departmentId>". */
	let editing = $state<string | null>(null);

	async function run(action: () => Promise<unknown>, override: (list: DepartmentDto[]) => DepartmentDto[]) {
		editing = null;
		try {
			await (action() as ReturnType<typeof saveDepartment>).updates(departments.withOverride(override));
			toast.success(m.dep_saved());
		} catch (error) {
			toast.error(errorMessage(error));
		}
	}

	const createDepartment = (name: string) =>
		run(
			() => saveDepartment({ name, active: true }),
			(list) => [...list, { id: crypto.randomUUID(), name, active: true, shifts: [] }]
		);
	const updateDepartment = (dep: DepartmentDto, patch: Partial<DepartmentDto>) =>
		run(
			() => saveDepartment({ id: dep.id, name: patch.name ?? dep.name, active: patch.active ?? dep.active }),
			(list) => list.map((d) => (d.id === dep.id ? { ...d, ...patch } : d))
		);
	const createShift = (dep: DepartmentDto, name: string) =>
		run(
			() => saveShift({ departmentId: dep.id, name, active: true }),
			(list) =>
				list.map((d) => (d.id === dep.id ? { ...d, shifts: [...d.shifts, { id: crypto.randomUUID(), name, active: true }] } : d))
		);
	const updateShift = (dep: DepartmentDto, shift: ShiftDto, patch: Partial<ShiftDto>) =>
		run(
			() => saveShift({ departmentId: dep.id, id: shift.id, name: patch.name ?? shift.name, active: patch.active ?? shift.active }),
			(list) =>
				list.map((d) =>
					d.id === dep.id ? { ...d, shifts: d.shifts.map((s) => (s.id === shift.id ? { ...s, ...patch } : s)) } : d
				)
		);
</script>

<svelte:head><title>{m.dep_title()} · {m.app_name()}</title></svelte:head>

<div class="grid grid-cols-[minmax(0,1fr)] gap-5 py-6">
	<div class="flex flex-wrap items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{m.dep_title()}</h1>
		<Button class="ml-auto" onclick={() => (editing = 'new')}><Plus />{m.dep_new()}</Button>
	</div>
	<p class="text-muted-foreground flex items-start gap-2 text-sm"><Info class="mt-0.5 size-4 shrink-0" />{m.dep_hint()}</p>

	{#if editing === 'new'}
		<div class="bg-card max-w-md rounded-2xl border p-4">
			<InlineName value="" placeholder={m.dep_name_placeholder()} onsave={createDepartment} oncancel={() => (editing = null)} />
		</div>
	{/if}

	<svelte:boundary>
		{#snippet pending()}<Skeleton class="h-64 w-full" />{/snippet}
		{#snippet failed(error, reset)}<ErrorState {error} {reset} />{/snippet}
		{@const list = await departments}
		{#if list.length === 0}
			<EmptyState icon={Building} title={m.dep_empty()} />
		{/if}
		<ul class="grid gap-4 lg:grid-cols-2">
			{#each list as dep (dep.id)}
				<li class="bg-card grid content-start gap-3 rounded-2xl border p-4">
					<div class="flex items-center gap-2" class:opacity-60={!dep.active}>
						{#if editing === `dep:${dep.id}`}
							<InlineName value={dep.name} placeholder={m.dep_name_placeholder()} onsave={(name) => updateDepartment(dep, { name })} oncancel={() => (editing = null)} />
						{:else}
							<Building class="text-muted-foreground size-4" />
							<h2 class="font-semibold">{dep.name}</h2>
							{#if !dep.active}<span class="bg-muted rounded px-1.5 text-xs">{m.dep_inactive_badge()}</span>{/if}
							<span class="ml-auto flex">
								<Button size="icon" variant="ghost" class="size-8" aria-label={m.dep_rename()} onclick={() => (editing = `dep:${dep.id}`)}><Pencil /></Button>
								<Button
									size="icon"
									variant="ghost"
									class="size-8"
									aria-label={dep.active ? m.dep_deactivate() : m.dep_activate()}
									title={dep.active ? m.dep_deactivate() : m.dep_activate()}
									onclick={() => updateDepartment(dep, { active: !dep.active })}
								>
									<Power />
								</Button>
							</span>
						{/if}
					</div>
					<ul class="grid gap-1">
						{#each dep.shifts as shift (shift.id)}
							<li class="hover:bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-1 text-sm" class:opacity-60={!shift.active}>
								{#if editing === `shift:${shift.id}`}
									<InlineName value={shift.name} placeholder={m.dep_shift_placeholder()} onsave={(name) => updateShift(dep, shift, { name })} oncancel={() => (editing = null)} />
								{:else}
									<span class="size-1.5 rounded-full" class:bg-primary={shift.active} class:bg-muted-foreground={!shift.active}></span>
									<span>{shift.name}</span>
									{#if !shift.active}<span class="bg-muted rounded px-1.5 text-xs">{m.shift_inactive_badge()}</span>{/if}
									<span class="ml-auto flex">
										<Button size="icon" variant="ghost" class="size-7" aria-label={m.dep_rename()} onclick={() => (editing = `shift:${shift.id}`)}><Pencil /></Button>
										<Button
											size="icon"
											variant="ghost"
											class="size-7"
											aria-label={shift.active ? m.dep_deactivate() : m.dep_activate()}
											title={shift.active ? m.dep_deactivate() : m.dep_activate()}
											onclick={() => updateShift(dep, shift, { active: !shift.active })}
										>
											<Power />
										</Button>
									</span>
								{/if}
							</li>
						{:else}
							<li class="text-muted-foreground px-2 text-sm">{m.dep_no_shifts()}</li>
						{/each}
					</ul>
					{#if editing === `add:${dep.id}`}
						<InlineName value="" placeholder={m.dep_shift_placeholder()} onsave={(name) => createShift(dep, name)} oncancel={() => (editing = null)} />
					{:else}
						<Button variant="ghost" size="sm" class="w-fit" onclick={() => (editing = `add:${dep.id}`)}><Plus />{m.dep_add_shift()}</Button>
					{/if}
				</li>
			{/each}
		</ul>
	</svelte:boundary>
</div>
