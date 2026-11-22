<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { activeHref, navFor } from '#lib/nav.ts';
	import { getUser } from '#lib/context.ts';
	import { m } from '#lib/paraglide/messages.js';
	import Logo from './logo.svelte';
	import UserMenu from './user-menu.svelte';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import { Button } from '#lib/components/ui/button/index.js';

	const user = getUser();
	const sidebar = Sidebar.useSidebar();
	const groups = $derived(navFor(user()));
	const active = $derived(activeHref(page.url.pathname));
</script>

<Sidebar.Root collapsible="icon" variant="inset">
	<Sidebar.Header>
		<div class="flex h-12 items-center gap-1">
			<!-- Expanded: logo + name, collapse button on the right -->
			<a
				href="/"
				class="hover:bg-sidebar-accent flex min-w-0 flex-1 items-center gap-2 rounded-md p-1.5 group-data-[collapsible=icon]:hidden"
			>
				<Logo class="size-8 shrink-0" />
				<span class="truncate text-base font-semibold tracking-tight">{m.app_name()}</span>
			</a>
			<Button
				variant="ghost"
				size="icon"
				class="text-sidebar-foreground/70 hover:text-sidebar-foreground shrink-0 group-data-[collapsible=icon]:hidden"
				aria-label={m.collapse_sidebar()}
				title={m.collapse_sidebar()}
				onclick={sidebar.toggle}
			>
				<PanelLeftClose />
			</Button>
			<!-- Collapsed: the logo itself expands the sidebar; it turns into the panel icon on hover -->
			<button
				type="button"
				class="group/expand hover:bg-sidebar-accent focus-visible:ring-sidebar-ring relative hidden size-8 place-items-center rounded-md outline-none focus-visible:ring-2 group-data-[collapsible=icon]:grid"
				aria-label={m.expand_sidebar()}
				title={m.expand_sidebar()}
				onclick={sidebar.toggle}
			>
				<Logo class="size-8 transition-opacity group-hover/expand:opacity-0 group-focus-visible/expand:opacity-0" />
				<PanelLeftOpen
					class="absolute size-4 opacity-0 transition-opacity group-hover/expand:opacity-100 group-focus-visible/expand:opacity-100"
				/>
			</button>
		</div>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each groups as group (group.label())}
			<Sidebar.Group>
				<Sidebar.GroupLabel>{group.label()}</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each group.items as item (item.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={active === item.href} tooltipContent={item.label()}>
									{#snippet child({ props })}
										<a href={item.href} aria-current={active === item.href ? 'page' : undefined} {...props}>
											<item.icon />
											<span>{item.label()}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer>
		<UserMenu />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
