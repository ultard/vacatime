// DTOs of the Vacatime Spring API (backend/src/main/kotlin/me/ultard/vacatime/dto).
// Dates are ISO strings: LocalDate → "YYYY-MM-DD", Instant → ISO timestamp.

export const ROLES = ['VIEWER', 'EDITOR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const VACATION_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type VacationStatus = (typeof VACATION_STATUSES)[number];
export const ACTIVE_STATUSES: readonly VacationStatus[] = ['DRAFT', 'PENDING', 'APPROVED'];

export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;
export type VacationPriority = (typeof PRIORITIES)[number];

export const COMPARISON_OPERATORS = ['EQ', 'GT', 'GTE', 'LT', 'LTE'] as const;
export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number];

export const BULK_OPERATIONS = ['ARCHIVE', 'RESTORE', 'CHANGE_STATUS', 'ADD_TAG', 'REMOVE_TAG'] as const;
export type BulkOperation = (typeof BULK_OPERATIONS)[number];

export const IMPORT_MODES = ['CREATE_ONLY', 'UPSERT_BY_VACATION_NUMBER'] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const VACATION_SORTS = ['createdAt', 'startDate', 'daysCount'] as const;
export type VacationSort = (typeof VACATION_SORTS)[number];

export const AUDIT_SORTS = ['createdAt', 'eventType', 'entityType'] as const;
export type AuditSort = (typeof AUDIT_SORTS)[number];

export type Direction = 'ASC' | 'DESC';

export interface TokenResponse {
	accessToken: string;
	refreshToken: string;
	mustChangePassword: boolean;
}

export interface UserDto {
	id: string;
	login: string;
	fullName: string;
	roles: Role[];
	active: boolean;
	mustChangePassword: boolean;
}

export interface VacationTypeDto {
	id: string;
	code: string;
	name: string;
	description: string | null;
	active: boolean;
}

export interface VacationDto {
	id: string;
	vacationNumber: string;
	employee: UserDto;
	vacationType: VacationTypeDto;
	title: string;
	description: string | null;
	startDate: string;
	endDate: string;
	daysCount: number;
	status: VacationStatus;
	urgent: boolean;
	tags: string[];
	priority: VacationPriority;
	version: number | null;
	archived: boolean;
}

export interface VacationRequest {
	employeeId: string;
	vacationTypeId: string;
	title: string;
	description?: string | null;
	startDate: string;
	endDate: string;
	urgent: boolean;
	tags: string[];
	status: VacationStatus;
	version?: number | null;
}

export interface VacationFilter {
	search?: string;
	employeeId?: string;
	vacationTypeId?: string;
	status?: VacationStatus;
	urgent?: boolean;
	priority?: VacationPriority;
	tag?: string;
	archived?: boolean;
	startDateFrom?: string;
	startDateTo?: string;
	daysCount?: number;
	daysCountOperator?: ComparisonOperator;
}

export interface PageResponse<T> {
	content: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
}

export interface NoteDto {
	id: string;
	author: UserDto;
	text: string;
	pinned: boolean;
	createdAt: string;
}

export interface BulkRequest {
	ids: string[];
	operation: BulkOperation;
	status?: VacationStatus;
	tag?: string;
}

export interface BulkResult {
	successfulIds: string[];
	errors: Record<string, string>;
}

export interface ImportRowResult {
	rowNumber: number;
	vacationNumber: string | null;
	request: VacationRequest | null;
	error: string | null;
}

export interface ImportPreviewResult {
	validRows: ImportRowResult[];
	invalidRows: ImportRowResult[];
}

export interface ImportApplyResult {
	successfulIds: string[];
	errors: Record<string, string>;
}

export interface AnalyticsDto {
	totalCount: number;
	activeCount: number;
	archivedCount: number;
	urgentCount: number;
	averageDaysCount: number;
	byVacationType: Record<string, number>;
	byStatus: Record<string, number>;
	byPriority: Record<string, number>;
}

export interface ShiftDayAvailabilityDto {
	date: string;
	planned: boolean;
	minimumStaff: number | null;
	scheduledStaff: number | null;
	approvedAbsent: number | null;
	pendingAbsent: number | null;
	availableAfterApproved: number | null;
	forecastAvailable: number | null;
	confirmedShortage: boolean | null;
	forecastShortage: boolean | null;
}

export interface ShiftAvailabilityDto {
	id: string;
	name: string;
	days: ShiftDayAvailabilityDto[];
}

export interface DepartmentAvailabilityDto {
	id: string;
	name: string;
	shifts: ShiftAvailabilityDto[];
}

export interface AvailabilityDto {
	from: string;
	to: string;
	departments: DepartmentAvailabilityDto[];
}

export interface ShiftDto {
	id: string;
	name: string;
	active: boolean;
}

export interface DepartmentDto {
	id: string;
	name: string;
	active: boolean;
	shifts: ShiftDto[];
}

export interface ShiftAssignmentRequest {
	shiftId: string;
	minimumStaff: number;
	employeeIds: string[];
}

export interface ShiftDayRequest {
	date: string;
	shifts: ShiftAssignmentRequest[];
}

export interface ShiftPlanRequest {
	days: ShiftDayRequest[];
}

export interface UserRequest {
	login: string;
	fullName: string;
	roles: Role[];
	active: boolean;
	temporaryPassword?: string | null;
}

export interface VacationTypeRequest {
	code: string;
	name: string;
	description?: string | null;
	active: boolean;
}

export interface AuditLogDto {
	id: string;
	userId: string | null;
	eventType: string;
	entityType: string;
	entityId: string | null;
	correlationId: string;
	description: string;
	createdAt: string;
}

export type ApiErrorCode =
	| 'VALIDATION_ERROR'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'VERSION_CONFLICT'
	| 'INTERNAL_ERROR'
	| 'NETWORK_ERROR';

export interface ApiErrorBody {
	timestamp?: string;
	status: number;
	error: ApiErrorCode | string;
	message: string;
	path?: string;
	correlationId?: string | null;
	fieldErrors?: Record<string, string>;
}

/** The current user as exposed to the UI. */
export interface SessionUser extends UserDto {
	isAdmin: boolean;
	canEdit: boolean;
}

export function toSessionUser(user: UserDto): SessionUser {
	return {
		...user,
		isAdmin: user.roles.includes('ADMIN'),
		canEdit: user.roles.includes('ADMIN') || user.roles.includes('EDITOR')
	};
}
