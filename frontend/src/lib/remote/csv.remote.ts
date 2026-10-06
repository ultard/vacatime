import { command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { IMPORT_MODES, type ImportApplyResult, type ImportPreviewResult } from '#lib/api/types.ts';
import { api } from '#lib/server/api/client.ts';
import { m } from '#lib/paraglide/messages.js';

const importSchema = z.object({
	csv: z.string().min(1).max(2_000_000),
	mode: z.enum(IMPORT_MODES)
});

function requireEditor() {
	if (!getRequestEvent().locals.user?.canEdit) error(403, m.err_forbidden());
}

export const previewImport = command(importSchema, async (request) => {
	requireEditor();
	return api.post<ImportPreviewResult>('/api/vacations/import/preview', request);
});

export const applyImport = command(importSchema, async (request) => {
	requireEditor();
	return api.post<ImportApplyResult>('/api/vacations/import/apply', request);
});
