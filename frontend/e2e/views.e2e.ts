import { expect, loginAs, test } from './helpers.ts';

test('dashboard shows KPIs, charts and widgets', async ({ page }) => {
	await loginAs(page, 'viewer');
	await expect(page.getByRole('link', { name: /Всего отпусков/ })).toContainText(/\d+/);
	await expect(page.getByRole('heading', { name: 'По статусам' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Ближайшие отпуска' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Нехватка персонала, 14 дней' })).toBeVisible();
	await expect(page.getByText(/возможная|Нехватки не ожидается/).first()).toBeVisible();
});

test('timeline lays out vacations per employee and switches zoom', async ({ page }) => {
	await loginAs(page, 'viewer');
	await page.goto('/vacations/timeline');
	const chart = page.getByRole('region', { name: 'Таймлайн отпусков' });
	await expect(chart).toBeVisible();
	await expect(chart.getByText(/Сотрудники: \d+/)).toBeVisible();
	await expect(chart.locator('.vt-bar').first()).toBeVisible();
	await page.getByRole('radio', { name: 'Год' }).click();
	await expect(page).toHaveURL(/zoom=year/);
	await page.getByRole('button', { name: 'Вперёд' }).click();
	await expect(page).toHaveURL(/at=\d{4}-01-01/);
});

test('board moves a card between columns with the keyboard', async ({ page }) => {
	await loginAs(page, 'editor');
	await page.goto('/vacations/board');
	const drafts = page.locator('[data-column="DRAFT"]');
	const card = drafts.locator('li button').first();
	const title = (await card.locator('span').first().textContent())!.trim();
	await card.focus();
	await page.keyboard.press(' ');
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press(' ');
	await expect(page.getByText(`«${title}» → На согласовании`)).toBeVisible();
	await expect(page.locator('[data-column="PENDING"]')).toContainText(title);
});

test('viewers see a read-only board', async ({ page }) => {
	await loginAs(page, 'viewer');
	await page.goto('/vacations/board');
	await expect(page.getByText('Только просмотр')).toBeVisible();
});

test('CSV import previews rows and applies valid ones', async ({ page }) => {
	await loginAs(page, 'editor');
	await page.goto('/vacations/import');
	const csv = [
		'vacationNumber,employeeId,vacationTypeId,title,description,startDate,endDate,urgent,tags,status,version',
		'E2E-1,10000000-0000-0000-0000-000000000006,00000000-0000-0000-0000-000000000001,Импорт,,2030-02-01,2030-02-05,false,"[""csv""]",DRAFT,',
		'E2E-2,not-a-uuid,00000000-0000-0000-0000-000000000001,Плохая строка,,2030-03-01,2030-03-02,false,[],DRAFT,'
	].join('\n');
	await page.getByTestId('csv-input').setInputFiles({ name: 'import.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
	await expect(page.getByText('Готово к импорту: 1')).toBeVisible();
	await expect(page.getByText('С ошибками: 1')).toBeVisible();
	await expect(page.getByText('Некорректный UUID: not-a-uuid')).toBeVisible();
	await page.getByRole('button', { name: 'Импортировать 1' }).click();
	await expect(page.getByText('Импортировано: 1. Ошибок: 1')).toBeVisible();
	await page.goto('/vacations?q=E2E-1');
	await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('availability heat map and shortage list', async ({ page }) => {
	await loginAs(page, 'viewer');
	await page.goto('/availability');
	const map = page.getByRole('region', { name: 'Доступность персонала' });
	await expect(map).toContainText('Колл-центр');
	await expect(map.locator('[data-level]').first()).toBeVisible();
	await page.getByRole('button', { name: 'Месяц' }).click();
	await expect(page).toHaveURL(/to=\d{4}-\d{2}-\d{2}/);
});

test('command palette navigates and searches vacations', async ({ page }) => {
	await loginAs(page, 'viewer');
	await page.keyboard.press('ControlOrMeta+k');
	await page.getByPlaceholder('Перейти, создать, найти отпуск…').fill('MOCK-001');
	await page.getByRole('option', { name: /Отпуск на море/ }).first().click();
	await expect(page).toHaveURL(/\/vacations\/30000000-0000-0000-0000-000000000001/);
});
