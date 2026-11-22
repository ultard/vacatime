/**
 * Fill a running Vacatime backend with demo data through its public API.
 *
 *   API_URL=http://localhost:8080 SEED_LOGIN=admin SEED_PASSWORD=... bun scripts/seed.ts
 *
 * Idempotent: departments, shifts, users and types are matched by name/login/code, vacations are
 * imported via CSV with fixed `SEED-…` numbers in CREATE_ONLY mode, so re-runs only add what is missing.
 * New users get the temporary password from SEED_USER_PASSWORD (default ChangeMe123!).
 */
const API_URL = (process.env.API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const LOGIN = process.env.SEED_LOGIN ?? 'admin';
const PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123!';
const USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'ChangeMe123!';

let token = '';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
	const response = await fetch(API_URL + path, {
		method,
		headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`${method} ${path} → ${response.status}: ${text}`);
	return (text ? JSON.parse(text) : undefined) as T;
}

// Deterministic PRNG so every run produces the same data set.
let seed = 20261005;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const iso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

const PEOPLE = [
	['a.ivanova', 'Анна Иванова'],
	['d.smirnov', 'Дмитрий Смирнов'],
	['m.kuznetsova', 'Мария Кузнецова'],
	['s.popov', 'Сергей Попов'],
	['o.vasilieva', 'Ольга Васильева'],
	['i.sokolov', 'Игорь Соколов'],
	['e.mikhailova', 'Екатерина Михайлова'],
	['a.novikov', 'Алексей Новиков'],
	['t.fedorova', 'Татьяна Фёдорова'],
	['p.morozov', 'Павел Морозов'],
	['n.volkova', 'Наталья Волкова'],
	['r.alekseev', 'Роман Алексеев'],
	['v.lebedeva', 'Виктория Лебедева'],
	['k.semenov', 'Кирилл Семёнов'],
	['y.egorova', 'Юлия Егорова']
] as const;

const DEPARTMENTS: Record<string, string[]> = {
	'Колл-центр': ['Утро', 'День', 'Вечер'],
	'Склад': ['Первая смена', 'Вторая смена'],
	'IT-поддержка': ['Дежурство', 'Ночь']
};

const TITLES = [
	'Отпуск на море',
	'Поездка к родителям',
	'Горы и треккинг',
	'Семейный отпуск',
	'Ремонт в квартире',
	'Свадьба друга',
	'Лечение',
	'Учёба и экзамены',
	'Путешествие по Грузии',
	'Отдых на даче',
	'Новогодние каникулы',
	'Длинные выходные'
];
const TAGS = ['лето', 'море', 'семья', 'перенос', 'за свой счёт', 'горы', 'срочно', 'зима'];

interface Page<T> {
	content: T[];
	totalPages: number;
}
interface User {
	id: string;
	login: string;
}
interface Department {
	id: string;
	name: string;
	active: boolean;
	shifts: { id: string; name: string; active: boolean }[];
}
interface VType {
	id: string;
	code: string;
}

async function main() {
	const tokens = await call<{ accessToken: string; mustChangePassword: boolean }>('POST', '/api/auth/login', {
		login: LOGIN,
		password: PASSWORD
	});
	if (tokens.mustChangePassword) {
		throw new Error(`${LOGIN} must change the temporary password first (sign in to the UI once).`);
	}
	token = tokens.accessToken;

	// Vacation types
	const types = await call<VType[]>('GET', '/api/vacation-types');
	if (!types.some((t) => t.code === 'STUDY')) {
		types.push(
			await call<VType>('POST', '/api/vacation-types', {
				code: 'STUDY',
				name: 'Учебный отпуск',
				description: 'Сессия и экзамены',
				active: true
			})
		);
	}

	// Users
	const users: User[] = [];
	for (let page = 0; ; page++) {
		const result = await call<Page<User>>('GET', `/api/admin/users?page=${page}&size=100`);
		users.push(...result.content);
		if (page + 1 >= result.totalPages) break;
	}
	for (const [login, fullName] of PEOPLE) {
		if (users.some((u) => u.login === login)) continue;
		users.push(
			await call<User>('POST', '/api/admin/users', {
				login,
				fullName,
				roles: ['VIEWER'],
				active: true,
				temporaryPassword: USER_PASSWORD
			})
		);
	}
	const staff = users.filter((u) => PEOPLE.some(([login]) => login === u.login) || u.login === 'elena');

	// Departments and shifts
	let departments = await call<Department[]>('GET', '/api/admin/departments');
	for (const [name, shifts] of Object.entries(DEPARTMENTS)) {
		let department = departments.find((d) => d.name === name);
		if (!department) department = await call<Department>('POST', '/api/admin/departments', { name, active: true });
		for (const shift of shifts) {
			if (!department.shifts?.some((s) => s.name === shift)) {
				await call('POST', `/api/admin/departments/${department.id}/shifts`, { name: shift, active: true });
			}
		}
	}
	departments = await call<Department[]>('GET', '/api/admin/departments');

	// Vacations via CSV import (idempotent through fixed numbers)
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	const rows: string[] = [
		'vacationNumber,employeeId,vacationTypeId,title,description,startDate,endDate,urgent,tags,status,version'
	];
	let n = 0;
	for (const user of staff) {
		let cursor = addDays(today, -90 + Math.floor(rand() * 30));
		const count = 3 + Math.floor(rand() * 3);
		for (let i = 0; i < count; i++) {
			const start = addDays(cursor, 7 + Math.floor(rand() * 40));
			const length = pick([3, 5, 7, 10, 14, 14, 21, 2]);
			const end = addDays(start, length - 1);
			cursor = addDays(end, 1);
			const past = end < today;
			const status = past
				? pick(['APPROVED', 'APPROVED', 'APPROVED', 'CANCELLED', 'REJECTED'] as const)
				: pick(['DRAFT', 'PENDING', 'PENDING', 'APPROVED', 'APPROVED', 'REJECTED'] as const);
			const type = rand() < 0.75 ? types.find((t) => t.code === 'ANNUAL')! : pick(types);
			const tags = TAGS.filter(() => rand() < 0.18).slice(0, 3);
			const title = pick(TITLES);
			const csvTags = JSON.stringify(tags).replaceAll('"', '""');
			rows.push(
				[
					`SEED-${String(++n).padStart(3, '0')}`,
					user.id,
					type.id,
					`"${title}"`,
					rand() < 0.4 ? `"Согласовано с руководителем отдела"` : '',
					iso(start),
					iso(end),
					String(rand() < 0.12),
					`"${csvTags}"`,
					status,
					''
				].join(',')
			);
		}
	}
	const applied = await call<{ successfulIds: string[]; errors: Record<string, string> }>(
		'POST',
		'/api/vacations/import/apply',
		{ csv: rows.join('\n'), mode: 'CREATE_ONLY' }
	);
	const skipped = Object.values(applied.errors).filter((e) => e === 'Vacation number already exists').length;
	const failed = Object.entries(applied.errors).filter(([, e]) => e !== 'Vacation number already exists');
	console.log(`vacations: ${applied.successfulIds.length} created, ${skipped} already present`);
	for (const [row, error] of failed) console.warn(`  row ${row}: ${error}`);

	// Notes for a few new vacations
	for (const id of applied.successfulIds.slice(0, 12)) {
		await call('POST', `/api/vacations/${id}/notes`, {
			text: pick(['Проверить график смен', 'Замену согласовал руководитель', 'Нужны билеты до пятницы']),
			pinned: rand() < 0.3
		});
	}

	// Shift plan for the next four weeks (whole plan, every department, as the API replaces by date)
	const active = departments.filter((d) => d.active).flatMap((d) => d.shifts.filter((s) => s.active));
	const days = [];
	for (let i = 0; i < 28; i++) {
		const date = addDays(today, i);
		const pool = [...staff].sort(() => rand() - 0.5);
		const shifts = active.map((shift) => ({
			shiftId: shift.id,
			minimumStaff: 1 + Math.floor(rand() * 2),
			employeeIds: pool.splice(0, 2).map((u) => u.id)
		}));
		days.push({ date: iso(date), shifts });
	}
	await call('PUT', '/api/admin/shift-plans', { days });
	console.log(`shift plan: ${days.length} days × ${active.length} shifts`);
	console.log('done');
}

main().catch((error) => {
	console.error(error.message ?? error);
	process.exit(1);
});
