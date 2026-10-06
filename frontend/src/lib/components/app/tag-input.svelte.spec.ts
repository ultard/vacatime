import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import TagInput from './tag-input.svelte';

describe('TagInput', () => {
	it('adds tags on Enter, ignores duplicates and removes with Backspace', async () => {
		const screen = render(TagInput, { tags: ['море'], id: 'tags' });
		const input = page.getByRole('textbox');
		await input.click();
		await userEvent.keyboard('горы{Enter}');
		await userEvent.keyboard('море{Enter}');
		await expect.element(page.getByText('горы')).toBeVisible();
		expect(screen.container.querySelectorAll('span.bg-secondary')).toHaveLength(2);
		await userEvent.keyboard('{Backspace}');
		await expect.element(page.getByText('горы')).not.toBeInTheDocument();
	});

	it('removes a tag with its button', async () => {
		render(TagInput, { tags: ['лето', 'зима'] });
		await page.getByRole('button', { name: /лето/ }).click();
		await expect.element(page.getByText('лето')).not.toBeInTheDocument();
		await expect.element(page.getByText('зима')).toBeVisible();
	});
});
