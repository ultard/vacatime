import { m } from '#lib/paraglide/messages.js';

export const CSV_HEADERS = [
	'vacationNumber',
	'employeeId',
	'vacationTypeId',
	'title',
	'description',
	'startDate',
	'endDate',
	'urgent',
	'tags',
	'status',
	'version'
] as const;

export const MAX_CSV_BYTES = 2_000_000;

export function csvTemplate(): string {
	return (
		CSV_HEADERS.join(',') +
		'\n' +
		'VAC-2027-001,00000000-0000-0000-0000-000000000000,00000000-0000-0000-0000-000000000001,"Отпуск на море",,2027-07-01,2027-07-14,false,"[""лето"",""море""]",PENDING,\n'
	);
}

/** Read a CSV file as UTF-8 text, enforcing the backend's limits up front. */
export async function readCsvFile(file: File): Promise<{ name: string; text: string }> {
	if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') throw new Error(m.imp_not_csv());
	if (file.size > MAX_CSV_BYTES) throw new Error(m.imp_too_big());
	const text = await file.text();
	if (text.length > MAX_CSV_BYTES) throw new Error(m.imp_too_big());
	return { name: file.name, text };
}
