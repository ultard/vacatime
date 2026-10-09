import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	API_URL: {
		description: 'Base URL of the Vacatime Spring API, e.g. http://localhost:8080',
		schema: (value) => (value || 'http://localhost:8080').replace(/\/+$/, '')
	}
});
