import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import EmployeePicker from './employee-picker.svelte';

const employees = [
	{ id: '11111111-1111-1111-1111-111111111111', fullName: 'Анна Иванова', login: 'anna', active: true },
	{ id: '22222222-2222-2222-2222-222222222222', fullName: 'Борис Петров', login: 'boris', active: true }
];

describe('EmployeePicker', () => {
	it('filters and selects an employee', async () => {
		const onchange = vi.fn();
		render(EmployeePicker, { employees, onchange });
		await page.getByRole('combobox').click();
		await userEvent.keyboard('Бор');
		await page.getByRole('option', { name: /Борис Петров/ }).click();
		expect(onchange).toHaveBeenCalledWith(employees[1].id);
		await expect.element(page.getByRole('combobox')).toHaveTextContent('Борис Петров');
	});

	it('accepts a UUID that is not in the list and explains partial lists', async () => {
		const onchange = vi.fn();
		render(EmployeePicker, { employees, complete: false, onchange });
		await page.getByRole('combobox').click();
		await expect.element(page.getByText(/Список неполный/)).toBeVisible();
		const id = '33333333-3333-3333-3333-333333333333';
		await userEvent.keyboard(id);
		await expect.element(page.getByRole('option', { name: new RegExp(id) })).toBeVisible();
		await userEvent.keyboard('{Enter}');
		expect(onchange).toHaveBeenCalledWith(id);
	});
});
