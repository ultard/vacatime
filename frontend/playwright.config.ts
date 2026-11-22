import { defineConfig, devices } from '@playwright/test';

const MOCK_PORT = 8099;
const APP_PORT = 4173;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	// The mock API keeps one shared in-memory state, so tests run one at a time.
	workers: 1,
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	timeout: 45_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: `http://localhost:${APP_PORT}`,
		locale: 'ru-RU',
		timezoneId: 'Europe/Moscow',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		// Animated backgrounds are not under test; reduced motion keeps them static.
		reducedMotion: 'reduce'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } } }],
	webServer: [
		{
			command: 'bun mock-api/server.ts',
			port: MOCK_PORT,
			env: { MOCK_PORT: String(MOCK_PORT) },
			reuseExistingServer: !process.env.CI
		},
		{
			command: 'bun run build && node build',
			port: APP_PORT,
			env: { API_URL: `http://localhost:${MOCK_PORT}`, PORT: String(APP_PORT), ORIGIN: `http://localhost:${APP_PORT}` },
			reuseExistingServer: !process.env.CI,
			timeout: 180_000
		}
	]
});
