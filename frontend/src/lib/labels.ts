import { m } from '#lib/paraglide/messages.js';
import type { Role, VacationPriority, VacationStatus } from '#lib/api/types.ts';

export const roleLabel = (role: Role): string =>
	({ VIEWER: m.role_VIEWER, EDITOR: m.role_EDITOR, ADMIN: m.role_ADMIN })[role]();

export const statusLabel = (status: VacationStatus): string =>
	({
		DRAFT: m.status_DRAFT,
		PENDING: m.status_PENDING,
		APPROVED: m.status_APPROVED,
		REJECTED: m.status_REJECTED,
		CANCELLED: m.status_CANCELLED
	})[status]();

export const priorityLabel = (priority: VacationPriority): string =>
	({ LOW: m.priority_LOW, NORMAL: m.priority_NORMAL, HIGH: m.priority_HIGH })[priority]();

const EVENT_LABELS: Record<string, () => string> = {
	LOGIN: m.event_LOGIN,
	LOGIN_FAILED: m.event_LOGIN_FAILED,
	LOGOUT: m.event_LOGOUT,
	CHANGE_PASSWORD: m.event_CHANGE_PASSWORD,
	RESET_PASSWORD: m.event_RESET_PASSWORD,
	CREATE: m.event_CREATE,
	UPDATE: m.event_UPDATE,
	DELETE: m.event_DELETE,
	ARCHIVE: m.event_ARCHIVE,
	RESTORE: m.event_RESTORE,
	PERMANENT_DELETE: m.event_PERMANENT_DELETE,
	CHANGE_STATUS: m.event_CHANGE_STATUS,
	ADD_TAG: m.event_ADD_TAG,
	REMOVE_TAG: m.event_REMOVE_TAG,
	REPLACE: m.event_REPLACE
};

const ENTITY_LABELS: Record<string, () => string> = {
	USER: m.entity_USER,
	VACATION: m.entity_VACATION,
	VACATION_NOTE: m.entity_VACATION_NOTE,
	VACATION_TYPE: m.entity_VACATION_TYPE,
	DEPARTMENT: m.entity_DEPARTMENT,
	SHIFT: m.entity_SHIFT,
	SHIFT_PLAN: m.entity_SHIFT_PLAN
};

/** Audit event names are open-ended strings: fall back to the raw value. */
export const eventLabel = (event: string): string => EVENT_LABELS[event]?.() ?? event;
export const entityLabel = (entity: string): string => ENTITY_LABELS[entity]?.() ?? entity;
