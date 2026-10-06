import AxeBuilder from '@axe-core/playwright';
import { expect, loginAs, test } from './helpers.ts';

const PAGES = ['/', '/vacations', '/vacations/timeline', '/vacations/board', '/availability', '/admin/users', '/admin/audit', '/admin/shift-plan'];

async function seriousViolations(page: import('@playwright/test').Page) {
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
	return results.violations
		.filter((v) => v.impact === 'serious' || v.impact === 'critical')
		.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
}

test('login page has no serious accessibility violations', async ({ page }) => {
	await page.goto('/login');
	await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
	expect(await seriousViolations(page)).toEqual([]);
});

for (const path of PAGES) {
	test(`${path} has no serious accessibility violations`, async ({ page }) => {
		await loginAs(page);
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		expect(await seriousViolations(page)).toEqual([]);
	});
}

test.describe('dark theme', () => {
	test.use({ colorScheme: 'dark' });
	for (const path of ['/', '/vacations', '/vacations/timeline', '/admin/shift-plan']) {
		test(`${path} has no serious accessibility violations`, async ({ page }) => {
			await loginAs(page);
			await page.goto(path);
			await page.waitForLoadState('networkidle');
			await expect(page.locator('html')).toHaveClass(/dark/);
			expect(await seriousViolations(page)).toEqual([]);
		});
	}
});
