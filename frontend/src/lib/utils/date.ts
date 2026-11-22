import { getLocale } from '#lib/paraglide/runtime.js';

const DAY = 86_400_000;

/** Local "today" as YYYY-MM-DD (the backend works with LocalDate). */
export function todayIso(now = new Date()): string {
	return toIso(now);
}

export function toIso(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as a local date (no timezone shift). */
export function parseIso(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
	const date = parseIso(iso);
	date.setDate(date.getDate() + days);
	return toIso(date);
}

/** Whole days between two ISO dates (b - a). */
export function diffDays(a: string, b: string): number {
	return Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / DAY);
}

function ymd(iso: string): [number, number, number] {
	const [y, m, d] = iso.split('-').map(Number);
	return [y, m - 1, d];
}

/** Calendar days of an inclusive range, like the backend's daysCount. */
export function inclusiveDays(start: string, end: string): number {
	return diffDays(start, end) + 1;
}

/** Mirror of VacationService.validate priority rule, for previews only. */
export function previewPriority(days: number, urgent: boolean): 'LOW' | 'NORMAL' | 'HIGH' {
	if (urgent || days > 20) return 'HIGH';
	if (days <= 3) return 'LOW';
	return 'NORMAL';
}

export function eachDay(from: string, to: string): string[] {
	const days: string[] = [];
	for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
	return days;
}

export function isWeekend(iso: string): boolean {
	const day = parseIso(iso).getDay();
	return day === 0 || day === 6;
}

const locale = () => (getLocale() === 'ru' ? 'ru-RU' : 'en-GB');

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
	return new Intl.DateTimeFormat(locale(), options).format(parseIso(iso));
}

export function formatRange(start: string, end: string): string {
	const format = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
	return format.formatRange(parseIso(start), parseIso(end));
}

export function formatDateTime(instant: string): string {
	return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant));
}

export function formatNumber(value: number, digits = 0): string {
	return new Intl.NumberFormat(locale(), { maximumFractionDigits: digits }).format(value);
}

export function intlLocale(): string {
	return locale();
}
