import { m } from '#lib/paraglide/messages.js';

type Translate = () => string;

/** Exact backend messages (see backend error/ and service/ sources) → localized text. */
const EXACT: Record<string, Translate> = {
	'Invalid credentials': m.err_invalid_credentials,
	'User is disabled': m.err_user_disabled,
	'Account is temporarily locked': m.err_account_locked,
	'Account is unavailable': m.err_account_unavailable,
	'Invalid refresh token': m.err_session_expired,
	'Expired refresh token': m.err_session_expired,
	'Invalid password': m.err_invalid_password,
	'New password must differ from the old password': m.err_password_same,
	'Refresh session belongs to another user': m.err_forbidden,
	'Authentication is required': m.err_auth_required,
	'Authentication failed': m.err_auth_required,
	'User not found': m.err_user_not_found,
	'Access is denied': m.err_forbidden,
	'Request validation failed': m.err_validation,
	'Invalid request parameters or body': m.err_invalid_request,
	'Invalid pagination or vacation sort field': m.err_invalid_request,
	'Invalid pagination or audit sort field': m.err_invalid_request,
	'Resource not found': m.err_not_found,
	'Vacation not found': m.err_vacation_not_found,
	'Employee not found': m.err_employee_not_found,
	'Author not found': m.err_user_not_found,
	'Vacation type not found': m.err_type_not_found,
	'Related entity not found': m.err_not_found,
	'Note not found': m.err_note_not_found,
	'Note not found for this vacation': m.err_note_not_found,
	'Department not found': m.err_department_not_found,
	'Shift not found': m.err_shift_not_found,
	'An active shift was not found': m.err_shift_not_found,
	'An employee was not found': m.err_employee_not_found,
	'Vacation version is stale': m.err_version_stale,
	'Vacation type is inactive': m.err_type_inactive,
	'startDate must not be after endDate': m.err_dates_order,
	'daysCount must be positive': m.err_dates_order,
	'At most 20 nonblank tags, each at most 100 characters, are allowed': m.err_tags_limit,
	'A nonblank tag of at most 100 characters is required': m.err_tag_required,
	'Employee has an overlapping active vacation': m.err_overlap,
	'Vacation cannot be approved': m.err_cannot_approve,
	'status is required': m.err_status_required,
	'Invalid operation': m.err_invalid_request,
	'At most 500 vacations can be processed at once': m.err_bulk_limit,
	'Database constraint conflict': m.err_db_conflict,
	'Business conflict': m.err_db_conflict,
	'Login already exists': m.err_login_exists,
	'A temporary password is required when creating a user': m.err_temp_password_required,
	'Each date can appear only once': m.err_plan_duplicate_date,
	'Shift plans can only be set for today or a future date': m.err_plan_past_date,
	'Each shift can appear only once per date': m.err_plan_duplicate_shift,
	'An employee can be assigned to only one shift per date': m.err_plan_employee_twice,
	'Availability range must be within today and the following 365 days': m.err_availability_range,
	'Vacation number already exists': m.err_vacation_number_exists,
	'Duplicate vacation number in CSV': m.err_csv_duplicate_number,
	'Vacation overlaps another row in CSV': m.err_csv_overlap_row,
	'At most 500 CSV rows can be imported at once': m.err_csv_rows_limit,
	'Malformed CSV': m.err_csv_malformed,
	'vacationNumber must be nonblank and at most 80 characters': m.err_csv_number_format,
	'Unexpected server error': m.err_server,
	'Invalid row': m.err_invalid_request
};

/**
 * Translate a message produced by the Spring API. Unknown messages fall back to a generic
 * text for their status, except 4xx validation details from CSV rows, which are kept verbatim
 * because they name the offending field.
 */
export function localizeBackendMessage(message: string | null | undefined, status?: number): string {
	if (message) {
		const exact = EXACT[message];
		if (exact) return exact();
		const headers = /^CSV must contain these headers: (.+)$/.exec(message);
		if (headers) return m.err_csv_headers({ headers: headers[1] });
		const uuid = /^Invalid UUID string: (.*)$/.exec(message);
		if (uuid) return m.err_csv_uuid({ value: uuid[1] });
		const date = /^Text '(.*)' could not be parsed/.exec(message);
		if (date) return m.err_csv_date({ value: date[1] });
		const status = /^No enum constant .*VacationStatus\.(.*)$/.exec(message);
		if (status) return m.err_csv_status({ value: status[1] });
		if (/^The string doesn't represent a boolean value/.test(message)) return m.err_csv_boolean();
		if (/^(Unexpected character|Cannot deserialize|Unrecognized token)/.test(message)) return m.err_csv_tags();
	}
	switch (status) {
		case 0:
		case 502:
		case 503:
		case 504:
			return m.err_network();
		case 400:
			return message && message.includes(':') ? message : m.err_invalid_request();
		case 401:
			return m.err_auth_required();
		case 403:
			return m.err_forbidden();
		case 404:
			return m.err_not_found();
		case 409:
			return message || m.err_db_conflict();
		default:
			return status && status >= 500 ? m.err_server() : message || m.err_unknown();
	}
}
