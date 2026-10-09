import { describe, expect, it } from 'vitest';
import { overwriteGetLocale } from '#lib/paraglide/runtime.js';

const setLocale = (locale: 'ru' | 'en', _opts?: unknown) => overwriteGetLocale(() => locale);
import { localizeBackendMessage } from './messages.ts';

describe('localizeBackendMessage', () => {
	it('translates known backend messages', () => {
		setLocale('en', { reload: false });
		expect(localizeBackendMessage('Employee has an overlapping active vacation', 409)).toBe(
			'The employee already has an active vacation on these dates'
		);
		setLocale('ru', { reload: false });
		expect(localizeBackendMessage('Invalid credentials', 401)).toBe('Неверный логин или пароль');
	});

	it('extracts CSV header lists', () => {
		setLocale('en', { reload: false });
		expect(localizeBackendMessage('CSV must contain these headers: a, b', 400)).toBe(
			'The CSV is missing required columns: a, b'
		);
	});

	it('localizes CSV parse errors', () => {
		setLocale('en', { reload: false });
		expect(localizeBackendMessage('Invalid UUID string: nope', 400)).toBe('Invalid UUID: nope');
		expect(localizeBackendMessage("Text '2027-13-01' could not be parsed: Invalid value", 400)).toContain('2027-13-01');
		expect(localizeBackendMessage('No enum constant me.ultard.vacatime.domain.VacationStatus.DONE', 400)).toBe(
			'Unknown status: DONE'
		);
	});

	it('falls back by status', () => {
		setLocale('en', { reload: false });
		expect(localizeBackendMessage('weird', 500)).toBe('Server error. Please try again');
		expect(localizeBackendMessage('', 503)).toContain('unreachable');
		expect(localizeBackendMessage('employeeId: must not be null', 400)).toBe('employeeId: must not be null');
	});
});
