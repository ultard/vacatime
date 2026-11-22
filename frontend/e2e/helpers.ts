import { expect, test as base, type Page } from '@playwright/test';

export const MOCK = 'http://localhost:8099';
export const PASSWORD = 'Passw0rd!';

export const test = base.extend<{ resetMock: void }>({
	resetMock: [
		async ({ request }, use) => {
			await request.post(`${MOCK}/__reset`);
			await use();
		},
		{ auto: true }
	]
});
export { expect };

export async function login(page: Page, user = 'admin', password = PASSWORD, { navigate = true } = {}) {
	if (navigate) await page.goto('/login');
	await page.getByLabel('Логин').fill(user);
	await page.getByLabel('Пароль', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Войти' }).click();
}

export async function loginAs(page: Page, user = 'admin') {
	await login(page, user);
	await expect(page.getByRole('heading', { level: 1 })).toContainText(/Добр/);
}

/** Token for calling the mock API directly (e.g. to simulate a colleague's edit). */
export async function apiToken(request: import('@playwright/test').APIRequestContext, user = 'editor') {
	const response = await request.post(`${MOCK}/api/auth/login`, { data: { login: user, password: PASSWORD } });
	return (await response.json()).accessToken as string;
}

export function isoInDays(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** First day of next month + offset, so it is visible in the two-month range calendar. */
export function nextMonthDay(day: number): string {
	const date = new Date();
	date.setDate(1);
	date.setMonth(date.getMonth() + 1);
	date.setDate(day);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function pickRange(page: Page, trigger: string, start: string, end: string) {
	await page.locator(trigger).click();
	await page.locator(`td[data-value="${start}"] [data-bits-day]`).click();
	await page.locator(`td[data-value="${end}"] [data-bits-day]`).click();
}
