import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import StatusBadge from './status-badge.svelte';

describe('StatusBadge', () => {
	it('renders the localized status', async () => {
		render(StatusBadge, { status: 'PENDING' });
		await expect.element(page.getByText('На согласовании')).toBeVisible();
	});
});
