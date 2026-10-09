/** Deterministic demo data for the mock API. Dates are relative to "today". */
type Role = 'VIEWER' | 'EDITOR' | 'ADMIN';
type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface State {
	users: {
		id: string;
		login: string;
		fullName: string;
		roles: Role[];
		active: boolean;
		mustChangePassword: boolean;
		password: string;
		failed: number;
		lockedUntil: number;
	}[];
	types: { id: string; code: string; name: string; description: string | null; active: boolean }[];
	vacations: {
		id: string;
		vacationNumber: string;
		employeeId: string;
		vacationTypeId: string;
		title: string;
		description: string | null;
		startDate: string;
		endDate: string;
		daysCount: number;
		status: Status;
		urgent: boolean;
		tags: string[];
		priority: string;
		version: number;
		archived: boolean;
		createdAt: string;
	}[];
	notes: { id: string; vacationId: string; authorId: string; text: string; pinned: boolean; createdAt: string }[];
	departments: { id: string; name: string; active: boolean; shifts: { id: string; name: string; active: boolean }[] }[];
	plans: { date: string; shiftId: string; minimumStaff: number; employeeIds: string[] }[];
	audit: {
		id: string;
		userId: string | null;
		eventType: string;
		entityType: string;
		entityId: string | null;
		correlationId: string;
		description: string;
		createdAt: string;
	}[];
	access: Map<string, string>;
	refresh: Map<string, string>;
}

export const PASSWORD = 'Passw0rd!';
export const USERS = {
	admin: '10000000-0000-0000-0000-000000000001',
	editor: '10000000-0000-0000-0000-000000000002',
	viewer: '10000000-0000-0000-0000-000000000003',
	elena: '10000000-0000-0000-0000-000000000004',
	inactive: '10000000-0000-0000-0000-000000000005',
	fresh: '10000000-0000-0000-0000-000000000006'
};
export const TYPES = {
	annual: '00000000-0000-0000-0000-000000000001',
	sick: '00000000-0000-0000-0000-000000000002',
	unpaid: '00000000-0000-0000-0000-000000000003'
};

const iso = (offset: number) => {
	const d = new Date();
	d.setUTCHours(0, 0, 0, 0);
	d.setUTCDate(d.getUTCDate() + offset);
	return d.toISOString().slice(0, 10);
};
const span = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;

export function fixtures(): State {
	const user = (id: string, login: string, fullName: string, roles: Role[], extra: Partial<State['users'][number]> = {}) => ({
		id,
		login,
		fullName,
		roles,
		active: true,
		mustChangePassword: false,
		password: PASSWORD,
		failed: 0,
		lockedUntil: 0,
		...extra
	});
	const users: State['users'] = [
		user(USERS.admin, 'admin', 'System Administrator', ['ADMIN']),
		user(USERS.editor, 'editor', 'Vacation Editor', ['EDITOR']),
		user(USERS.viewer, 'viewer', 'Vacation Viewer', ['VIEWER']),
		user(USERS.elena, 'elena', 'Elena Petrova', ['VIEWER']),
		user(USERS.inactive, 'inactive', 'Inactive User', ['VIEWER'], { active: false }),
		user(USERS.fresh, 'fresh', 'Fresh Employee', ['VIEWER'], { mustChangePassword: true })
	];
	const staff = ['Анна Иванова', 'Дмитрий Смирнов', 'Мария Кузнецова', 'Сергей Попов', 'Ольга Васильева', 'Игорь Соколов'];
	staff.forEach((name, i) => users.push(user(`20000000-0000-0000-0000-00000000000${i + 1}`, `staff${i + 1}`, name, ['VIEWER'])));

	const types: State['types'] = [
		{ id: TYPES.annual, code: 'ANNUAL', name: 'Annual leave', description: 'Paid annual leave', active: true },
		{ id: TYPES.sick, code: 'SICK', name: 'Sick leave', description: 'Medical leave', active: true },
		{ id: TYPES.unpaid, code: 'UNPAID', name: 'Unpaid leave', description: null, active: false }
	];

	const statuses: Status[] = ['APPROVED', 'PENDING', 'DRAFT', 'APPROVED', 'REJECTED', 'PENDING', 'CANCELLED'];
	const titles = ['Отпуск на море', 'Горы и треккинг', 'Поездка к родителям', 'Семейный отпуск', 'Ремонт в квартире'];
	const employees = users.filter((u) => u.active && !u.mustChangePassword && u.roles.includes('VIEWER')).concat(users[1]);
	const vacations: State['vacations'] = [];
	let n = 0;
	employees.forEach((employee, e) => {
		let cursor = -40 + e * 3;
		for (let k = 0; k < 4; k++) {
			const start = cursor + 6 + ((e * 7 + k * 11) % 20);
			const length = [3, 7, 14, 5, 21, 2][(e + k) % 6];
			const startDate = iso(start);
			const endDate = iso(start + length - 1);
			cursor = start + length;
			const status = statuses[(e + k) % statuses.length];
			const urgent = (e + k) % 5 === 0;
			const daysCount = span(startDate, endDate);
			n++;
			vacations.push({
				id: `30000000-0000-0000-0000-${String(n).padStart(12, '0')}`,
				vacationNumber: `MOCK-${String(n).padStart(3, '0')}`,
				employeeId: employee.id,
				vacationTypeId: k === 3 ? TYPES.sick : TYPES.annual,
				title: titles[(e + k) % titles.length],
				description: k % 2 ? 'Согласовано с руководителем' : null,
				startDate,
				endDate,
				daysCount,
				status,
				urgent,
				tags: k % 2 ? ['лето'] : ['море', 'семья'].slice(0, (e % 2) + 1),
				priority: urgent || daysCount > 20 ? 'HIGH' : daysCount <= 3 ? 'LOW' : 'NORMAL',
				version: 0,
				archived: n % 13 === 0,
				createdAt: new Date(Date.now() - n * 3_600_000).toISOString()
			});
		}
	});

	const departments: State['departments'] = [
		{
			id: '40000000-0000-0000-0000-000000000001',
			name: 'Колл-центр',
			active: true,
			shifts: [
				{ id: '50000000-0000-0000-0000-000000000001', name: 'Утро', active: true },
				{ id: '50000000-0000-0000-0000-000000000002', name: 'Вечер', active: true }
			]
		},
		{
			id: '40000000-0000-0000-0000-000000000002',
			name: 'Склад',
			active: true,
			shifts: [{ id: '50000000-0000-0000-0000-000000000003', name: 'Первая смена', active: true }]
		}
	];
	const shiftIds = departments.flatMap((d) => d.shifts.map((s) => s.id));
	const plans: State['plans'] = [];
	for (let day = 0; day < 14; day++) {
		shiftIds.forEach((shiftId, i) => {
			const a = employees[(day + i * 2) % employees.length].id;
			const b = employees[(day + i * 2 + 1) % employees.length].id;
			plans.push({ date: iso(day), shiftId, minimumStaff: 2, employeeIds: [a, b] });
		});
	}

	return {
		users,
		types,
		vacations,
		notes: [
			{ id: '60000000-0000-0000-0000-000000000001', vacationId: vacations[0].id, authorId: USERS.editor, text: 'Билеты куплены', pinned: true, createdAt: new Date().toISOString() }
		],
		departments,
		plans,
		audit: [],
		access: new Map(),
		refresh: new Map()
	};
}
