import type { Component } from 'svelte';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import TreePalm from '@lucide/svelte/icons/tree-palm';
import ChartGantt from '@lucide/svelte/icons/chart-gantt';
import Kanban from '@lucide/svelte/icons/kanban';
import FileUp from '@lucide/svelte/icons/file-up';
import Activity from '@lucide/svelte/icons/activity';
import UsersRound from '@lucide/svelte/icons/users-round';
import Tags from '@lucide/svelte/icons/tags';
import Building from '@lucide/svelte/icons/building-2';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import { m } from '#lib/paraglide/messages.js';
import type { SessionUser } from '#lib/api/types.ts';

export interface NavItem {
	href: string;
	label: () => string;
	icon: Component;
	access?: 'edit' | 'admin';
}

export interface NavGroup {
	label: () => string;
	items: NavItem[];
}

export const NAV: NavGroup[] = [
	{
		label: m.nav_vacations,
		items: [
			{ href: '/', label: m.nav_overview, icon: LayoutDashboard },
			{ href: '/vacations', label: m.nav_vacations_list, icon: TreePalm },
			{ href: '/vacations/timeline', label: m.nav_timeline, icon: ChartGantt },
			{ href: '/vacations/board', label: m.nav_board, icon: Kanban },
			{ href: '/vacations/import', label: m.nav_import, icon: FileUp, access: 'edit' }
		]
	},
	{
		label: m.nav_planning,
		items: [{ href: '/availability', label: m.nav_availability, icon: Activity }]
	},
	{
		label: m.nav_admin,
		items: [
			{ href: '/admin/users', label: m.nav_users, icon: UsersRound, access: 'admin' },
			{ href: '/admin/vacation-types', label: m.nav_vacation_types, icon: Tags, access: 'admin' },
			{ href: '/admin/departments', label: m.nav_departments, icon: Building, access: 'admin' },
			{ href: '/admin/shift-plan', label: m.nav_shift_plan, icon: CalendarClock, access: 'admin' },
			{ href: '/admin/audit', label: m.nav_audit, icon: ScrollText, access: 'admin' }
		]
	}
];

export function canAccess(item: { access?: 'edit' | 'admin' }, user: SessionUser): boolean {
	if (item.access === 'admin') return user.isAdmin;
	if (item.access === 'edit') return user.canEdit;
	return true;
}

export function navFor(user: SessionUser): NavGroup[] {
	return NAV.map((group) => ({ ...group, items: group.items.filter((item) => canAccess(item, user)) })).filter(
		(group) => group.items.length > 0
	);
}

/** The nav item whose href is the longest prefix of `pathname`. */
export function activeHref(pathname: string): string | undefined {
	let best: string | undefined;
	for (const group of NAV) {
		for (const { href } of group.items) {
			const match = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
			if (match && (!best || href.length > best.length)) best = href;
		}
	}
	return best;
}
