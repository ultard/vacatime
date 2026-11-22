import { apiToken, expect, loginAs, MOCK, nextMonthDay, pickRange, test } from './helpers.ts';

test.describe('vacation list', () => {
	test('filters through presets, search and the URL', async ({ page }) => {
		await loginAs(page, 'viewer');
		await page.goto('/vacations');
		await expect(page.getByText(/Всего: \d+/)).toBeVisible();
		const total = Number((await page.getByText(/Всего: \d+/).textContent())!.match(/\d+/)![0]);

		await page.getByRole('button', { name: 'На согласовании', exact: true }).click();
		await expect(page).toHaveURL(/status=PENDING/);
		await expect(page.locator('tbody tr').first()).toContainText('На согласовании');
		const pending = Number((await page.getByText(/Всего: \d+/).textContent())!.match(/\d+/)![0]);
		expect(pending).toBeLessThan(total);

		await page.getByRole('searchbox', { name: /Поиск/ }).fill('MOCK-001');
		await expect(page).toHaveURL(/q=MOCK-001/);
		await page.getByRole('button', { name: 'Все', exact: true }).click();
		await expect(page.locator('tbody tr')).toHaveCount(1);

		await page.goto('/vacations?q=nothing-matches');
		await expect(page.getByText('Под фильтры ничего не подходит')).toBeVisible();
	});

	test('quick filters combine and switch off on a second click', async ({ page }) => {
		await loginAs(page, 'viewer');
		await page.goto('/vacations');
		const chip = (name: string) => page.getByRole('group', { name: 'Фильтры' }).getByRole('button', { name, exact: true });
		await chip('Черновики').click();
		await expect(page).toHaveURL(/status=DRAFT/);
		await chip('Срочные').click();
		await expect(page).toHaveURL(/status=DRAFT&urgent=true/);
		await expect(chip('Черновики')).toHaveAttribute('aria-pressed', 'true');
		await expect(chip('Срочные')).toHaveAttribute('aria-pressed', 'true');

		await chip('На согласовании').click();
		await expect(page).toHaveURL(/status=PENDING/);
		await expect(chip('Черновики')).toHaveAttribute('aria-pressed', 'false');

		await chip('На согласовании').click();
		await expect(page).not.toHaveURL(/status=/);
		await chip('Срочные').click();
		await expect(page).toHaveURL(/\/vacations$/);
		await expect(chip('Все')).toHaveAttribute('aria-pressed', 'true');

		await chip('Ближайшие').click();
		await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&sort=startDate&dir=ASC/);
		await chip('Ближайшие').click();
		await expect(page).toHaveURL(/\/vacations$/);

		await chip('Архив').click();
		await chip('Срочные').click();
		await chip('Все').click();
		await expect(page).toHaveURL(/\/vacations$/);
	});

	test('opens a vacation in a drawer with shallow routing', async ({ page }) => {
		await loginAs(page, 'viewer');
		await page.goto('/vacations?q=MOCK-001');
		await page.locator('tbody tr').first().getByRole('link').click();
		await expect(page).toHaveURL(/\/vacations\/30000000-0000-0000-0000-000000000001$/);
		const drawer = page.getByRole('dialog');
		await expect(drawer.getByText('MOCK-001')).toBeVisible();
		await expect(drawer.getByText('Билеты куплены')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page).toHaveURL(/\/vacations\?q=MOCK-001/);
	});

	test('exports the filtered list as CSV through the BFF', async ({ page }) => {
		await loginAs(page, 'viewer');
		const response = await page.request.get('/vacations/export?status=APPROVED');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-disposition']).toMatch(/attachment; filename="vacations-/);
		const csv = await response.text();
		expect(csv.split('\n')[0]).toBe('vacationNumber,employeeId,vacationTypeId,title,description,startDate,endDate,urgent,tags,status,version');
		expect(csv).toContain('APPROVED');
		expect(csv).not.toContain('PENDING');
	});

	test('bulk actions report partial failures', async ({ page }) => {
		await loginAs(page, 'editor');
		await page.goto('/vacations?status=REJECTED');
		await page.getByRole('checkbox', { name: 'Выбрать все на странице' }).click();
		const toolbar = page.getByRole('toolbar');
		await expect(toolbar).toContainText('Выбрано:');
		await toolbar.getByRole('combobox', { name: 'Сменить статус' }).selectOption('APPROVED');
		await expect(page.getByRole('dialog')).toContainText('Этот отпуск нельзя согласовать');
	});
});

test.describe('vacation editing', () => {
	test('creates a vacation, reports overlaps and edits it', async ({ page }) => {
		await loginAs(page, 'admin');
		await page.goto('/vacations/new');
		await page.getByLabel('Название').fill('Е2Е отпуск');
		await page.locator('#vf-employee').click();
		await page.getByPlaceholder('Имя или логин…').fill('Fresh');
		await page.getByRole('option', { name: /Fresh Employee/ }).click();
		await pickRange(page, '#vf-dates', nextMonthDay(10), nextMonthDay(14));
		await expect(page.getByText(/Предпросмотр: Календарных дней: 5 · приоритет «Обычный»/)).toBeVisible();
		await page.locator('#vf-tags').fill('тест');
		await page.keyboard.press('Enter');
		await page.getByRole('button', { name: 'Создать', exact: true }).click();
		await expect(page).toHaveURL(/\/vacations\/[0-9a-f-]{36}$/);
		await expect(page.getByRole('heading', { name: 'Е2Е отпуск' })).toBeVisible();
		await expect(page.getByText('Календарных дней: 5')).toBeVisible();

		// A second active vacation on the same dates overlaps.
		await page.goto('/vacations/new');
		await page.getByLabel('Название').fill('Дубль');
		await page.locator('#vf-employee').click();
		await page.getByPlaceholder('Имя или логин…').fill('Fresh');
		await page.getByRole('option', { name: /Fresh Employee/ }).click();
		await pickRange(page, '#vf-dates', nextMonthDay(12), nextMonthDay(16));
		await page.getByRole('button', { name: 'Создать', exact: true }).click();
		await expect(page.getByText('У сотрудника уже есть активный отпуск в эти даты')).toBeVisible();
	});

	test('changes status, adds a note, archives and restores', async ({ page }) => {
		await loginAs(page, 'editor');
		await page.goto('/vacations/30000000-0000-0000-0000-000000000002');
		await expect(page.getByText('На согласовании').first()).toBeVisible();
		await page.getByRole('button', { name: 'Согласовать' }).click();
		await expect(page.getByText('Статус: Согласован')).toBeVisible();
		await expect(page.getByText('Версия 1')).toBeVisible();

		await page.getByPlaceholder('Добавить заметку…').fill('Проверено в e2e');
		await page.getByRole('button', { name: 'Добавить' }).click();
		await expect(page.getByText('Проверено в e2e')).toBeVisible();

		await page.getByRole('button', { name: 'В архив' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'В архив' }).click();
		await expect(page.getByText('Отпуск в архиве')).toBeVisible();
		await page.getByRole('button', { name: 'Восстановить' }).click();
		await expect(page.getByText('Отпуск в архиве')).toHaveCount(0);
	});

	test('detects a concurrent edit and lets the user overwrite', async ({ page, request }) => {
		const id = '30000000-0000-0000-0000-000000000003';
		await loginAs(page, 'editor');
		await page.goto(`/vacations/${id}/edit`);
		await expect(page.getByLabel('Название')).not.toHaveValue('');

		// A colleague saves first.
		const token = await apiToken(request, 'admin');
		const current = await (await request.get(`${MOCK}/api/vacations/${id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
		await request.put(`${MOCK}/api/vacations/${id}`, {
			headers: { Authorization: `Bearer ${token}` },
			data: { ...current, employeeId: current.employee.id, vacationTypeId: current.vacationType.id, title: 'Правка коллеги' }
		});

		await page.getByLabel('Название').fill('Моя правка');
		await page.getByRole('button', { name: 'Сохранить' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText('Отпуск изменили, пока вы редактировали');
		await expect(dialog).toContainText('Правка коллеги');
		await dialog.getByRole('button', { name: 'Сохранить мои правки поверх' }).click();
		await expect(page).toHaveURL(new RegExp(`/vacations/${id}$`));
		await expect(page.getByRole('heading', { name: 'Моя правка' })).toBeVisible();
	});

	test('admins can delete permanently', async ({ page }) => {
		await loginAs(page, 'admin');
		await page.goto('/vacations/30000000-0000-0000-0000-000000000004');
		await page.getByRole('button', { name: 'Удалить навсегда' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить навсегда' }).click();
		await expect(page).toHaveURL(/\/vacations$/);
		await expect(page.getByText('Удалено')).toBeVisible();
	});

	test('viewers cannot open the editor', async ({ page }) => {
		await loginAs(page, 'viewer');
		const response = await page.goto('/vacations/30000000-0000-0000-0000-000000000001/edit');
		expect(response?.status()).toBe(403);
	});
});
