<script lang="ts">
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import LogOut from '@lucide/svelte/icons/log-out';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { getUser } from '#lib/context.ts';
	import { logout } from '#lib/remote/auth.remote.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { roleLabel } from '#lib/labels.ts';
	import UserAvatar from './user-avatar.svelte';

	const user = getUser();
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton size="lg" aria-label={m.user_menu()} {...props}>
						<UserAvatar name={user().fullName} class="size-8" />
						<span class="grid flex-1 text-left leading-tight">
							<span class="truncate text-sm font-medium">{user().fullName}</span>
							<span class="text-muted-foreground truncate text-xs">
								{user().roles.map(roleLabel).join(', ')}
							</span>
						</span>
						<ChevronsUpDown class="ml-auto" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<!-- Opens upwards, over the trigger, like an account menu at the bottom of a sidebar. -->
			<DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width) min-w-56" side="top" align="start" sideOffset={6}>
				<DropdownMenu.Label class="font-normal">
					<div class="grid text-sm">
						<span class="font-medium">{user().fullName}</span>
						<span class="text-muted-foreground text-xs">@{user().login}</span>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<form {...logout}>
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<button type="submit" class="w-full" {...props}>
								<LogOut />
								{m.logout()}
							</button>
						{/snippet}
					</DropdownMenu.Item>
				</form>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
