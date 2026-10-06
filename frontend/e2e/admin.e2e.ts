import { expect, loginAs, test } from './helpers.ts';

test('creates a user and resets a password', async ({ page }) => {
	await loginAs(page, 'admin');
	await page.goto('/admin/users');
	await page.getByRole('button', { name: 'Новый пользователь' }).click();
	const sheet = page.getByRole('dialog');
	await sheet.getByLabel('Логин').fill('e2e.user');
	await sheet.getByLabel('ФИО').fill('Е2Е Пользователь');
	await sheet.getByRole('checkbox', { name: /Редактор/ }).check();
	await sheet.getByRole('button', { name: 'Создать' }).click();
	await expect(sheet.getByText('Для нового пользователя нужен временный пароль')).toBeVisible();
	await sheet.getByRole('button', { name: 'Сгенерировать' }).click();
	await sheet.getByRole('button', { name: 'Создать' }).click();
	await expect(page.getByText('Пользователь сохранён')).toBeVisible();
	await expect(page.getByRole('cell', { name: /Е2Е Пользователь/ })).toBeVisible();

	await page.getByRole('row', { name: /Е2Е Пользователь/ }).getByRole('button', { name: 'Сбросить пароль' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Сбросить пароль' }).click();
	await expect(page.getByText('Пароль сброшен')).toBeVisible();
});

test('rejects a duplicate login', async ({ page }) => {
	await loginAs(page, 'admin');
	await page.goto('/admin/users');
	await page.getByRole('button', { name: 'Новый пользователь' }).click();
	const sheet = page.getByRole('dialog');
	await sheet.getByLabel('Логин').fill('editor');
	await sheet.getByLabel('ФИО').fill('Дубликат');
	await sheet.getByRole('button', { name: 'Сгенерировать' }).click();
	await sheet.getByRole('button', { name: 'Создать' }).click();
	await expect(sheet.getByText('Такой логин уже занят')).toBeVisible();
});

test('manages vacation types', async ({ page }) => {
	await loginAs(page, 'admin');
	await page.goto('/admin/vacation-types');
	await page.getByRole('button', { name: 'Новый тип' }).click();
	const sheet = page.getByRole('dialog');
	await sheet.getByLabel('Код').fill('STUDY');
	await sheet.getByLabel('Название').fill('Учебный');
	await sheet.getByRole('button', { name: 'Создать' }).click();
	await expect(page.getByText('Тип сохранён')).toBeVisible();
	await expect(page.getByText('Учебный', { exact: true })).toBeVisible();
});

test('adds a department and a shift', async ({ page }) => {
	await loginAs(page, 'admin');
	await page.goto('/admin/departments');
	await page.getByRole('button', { name: 'Новый отдел' }).click();
	await page.getByPlaceholder('Название отдела').fill('Бухгалтерия');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('heading', { name: 'Бухгалтерия' })).toBeVisible();
	const card = page.locator('li', { has: page.getByRole('heading', { name: 'Бухгалтерия' }) });
	await card.getByRole('button', { name: 'Добавить смену' }).click();
	await page.getByPlaceholder('Название смены').fill('Дневная');
	await page.keyboard.press('Enter');
	await expect(card.getByText('Дневная')).toBeVisible();
});

test('shift plan wizard saves the whole plan after confirmation', async ({ page }) => {
	await loginAs(page, 'admin');
	await page.goto('/admin/shift-plan');
	await page.evaluate(() => localStorage.removeItem('vt_shift_plan_draft'));
	await page.reload();
	await page.getByRole('button', { name: 'Подтянуть минимумы из текущего плана' }).click();
	await expect(page.getByText(/Минимумы подтянуты для \d+ ячеек/)).toBeVisible();
	await expect(page.getByText(/Запланированных смен: [1-9]/)).toBeVisible();
	await page.getByRole('button', { name: 'Заменить план' }).click();
	await expect(page.getByRole('alertdialog')).toContainText('ВСЕ планы ВСЕХ отделов');
	await page.getByRole('alertdialog').getByRole('button', { name: 'Заменить план' }).click();
	await expect(page.getByText('План смен сохранён')).toBeVisible();
});

test('audit log lists and searches events', async ({ page }) => {
	await loginAs(page, 'admin');
	await page.goto('/admin/audit');
	await expect(page.getByRole('cell', { name: 'Вход' }).first()).toBeVisible();
	await page.getByPlaceholder(/Описание, событие/).fill('NOTHING_LIKE_THIS');
	await expect(page.getByText('Событий не найдено')).toBeVisible();
});
