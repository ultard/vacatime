import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import DonutChart from './donut-chart.svelte';

const data = [
	{ key: 'a', label: 'Черновик', value: 1, color: 'red' },
	{ key: 'b', label: 'Согласован', value: 3, color: 'green' },
	{ key: 'c', label: 'Отменён', value: 0, color: 'gray' }
];

describe('DonutChart', () => {
	it('draws one arc per non-empty segment and shows the total', async () => {
		const screen = render(DonutChart, { data, centerLabel: 'Все' });
		await expect.element(page.getByRole('img', { name: 'Все: 4' })).toBeVisible();
		expect(screen.container.querySelectorAll('circle.segment')).toHaveLength(2);
		const [first, second] = [...screen.container.querySelectorAll<SVGCircleElement>('circle.segment')];
		const circumference = 2 * Math.PI * 69;
		expect(Number(first.getAttribute('stroke-dasharray')!.split(' ')[0])).toBeCloseTo(circumference / 4 - 2, 1);
		expect(Number(second.getAttribute('stroke-dashoffset'))).toBeCloseTo(-circumference / 4, 1);
	});

	it('highlights a segment from the legend', async () => {
		render(DonutChart, { data, centerLabel: 'Все' });
		await page.getByRole('button', { name: /Согласован/ }).hover();
		await expect.element(page.getByText('Согласован · 75%')).toBeVisible();
	});
});
