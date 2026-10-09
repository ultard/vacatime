import { expect, login, loginAs, PASSWORD, test } from './helpers.ts';

test('anonymous users are sent to login and back after signing in', async ({ page }) => {
	await page.goto('/vacations?status=PENDING');
	await expect(page).toHaveURL(/\/login\?next=%2Fvacations%3Fstatus%3DPENDING/);
	await login(page, 'admin', PASSWORD, { navigate: false });
	await expect(page).toHaveURL(/\/vacations\?status=PENDING/);
	await expect(page.getByRole('heading', { name: 'Отпуска' })).toBeVisible();
});

test('wrong password shows a localized error', async ({ page }) => {
	await login(page, 'admin', 'nope');
	await expect(page.getByRole('alert')).toHaveText('Неверный логин или пароль');
	await expect(page).toHaveURL(/\/login/);
});

test('disabled accounts cannot sign in', async ({ page }) => {
	await login(page, 'inactive');
	await expect(page.getByRole('alert')).toContainText('Учётная запись отключена');
});

test('client-side validation runs before submit', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Войти' }).click();
	await expect(page.getByText('Обязательное поле').first()).toBeVisible();
});

test('temporary password must be changed, then the user is signed in again', async ({ page }) => {
	await login(page, 'fresh');
	await expect(page).toHaveURL(/\/change-password/);
	await page.goto('/vacations');
	await expect(page).toHaveURL(/\/change-password/);

	await page.getByLabel('Текущий пароль').fill(PASSWORD);
	await page.getByLabel('Новый пароль', { exact: true }).fill('short');
	await page.getByLabel('Повторите новый пароль').fill('different');
	await page.getByRole('button', { name: 'Сменить пароль' }).click();
	await expect(page.getByText('Минимум 8 символов')).toBeVisible();
	await expect(page.getByText('Пароли не совпадают')).toBeVisible();

	await page.getByLabel('Новый пароль', { exact: true }).fill('Brand-New-Pass-1');
	await page.getByLabel('Повторите новый пароль').fill('Brand-New-Pass-1');
	await page.getByRole('button', { name: 'Сменить пароль' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText(/Добр.*, Fresh/);
});

test('logout ends the session', async ({ page }) => {
	await loginAs(page);
	await page.getByRole('button', { name: 'Меню пользователя' }).click();
	await page.getByRole('menuitem', { name: 'Выйти' }).click();
	await expect(page).toHaveURL(/\/login/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
});

test('viewers see no admin menu and get 403 on admin pages', async ({ page }) => {
	await loginAs(page, 'viewer');
	await expect(page.getByRole('link', { name: 'Пользователи' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Новый отпуск' })).toHaveCount(0);
	const response = await page.goto('/admin/users');
	expect(response?.status()).toBe(403);
	await expect(page.getByRole('heading', { name: 'Нет доступа' })).toBeVisible();
});

test('language and theme can be switched', async ({ page }) => {
	await loginAs(page);
	await page.getByRole('button', { name: 'Язык' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await page.getByRole('button', { name: 'Theme' }).click();
	await page.getByRole('menuitemradio', { name: 'Dark' }).click();
	await expect(page.locator('html')).toHaveClass(/dark/);
});

test('login page renders the shift-puzzle background', async ({ page }) => {
	await page.goto('/login');
	const canvas = page.locator('canvas');
	await expect(canvas).toHaveCount(1);
	await expect(canvas).toBeVisible();
	await expect(page.getByRole('radiogroup')).toHaveCount(0);
});

test('the sidebar collapses to icons and expands from its logo', async ({ page }) => {
	await loginAs(page);
	const sidebar = page.locator('[data-slot=sidebar]').first();
	await expect(page.getByRole('link', { name: 'Vacatime' })).toBeVisible();
	await page.getByRole('button', { name: 'Свернуть меню' }).click();
	await expect(page.getByRole('link', { name: 'Vacatime' })).toBeHidden();
	await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
	await page.getByRole('button', { name: 'Развернуть меню' }).click();
	await expect(sidebar).toHaveAttribute('data-state', 'expanded');
	await expect(page.getByRole('link', { name: 'Vacatime' })).toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the login form still signs in and redirects', async ({ page }) => {
		await page.goto('/login?next=%2Fvacations');
		await page.getByLabel('Логин').fill('viewer');
		await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
		await page.getByRole('button', { name: 'Войти' }).click();
		await expect(page).toHaveURL(/\/vacations$/);
	});
});
