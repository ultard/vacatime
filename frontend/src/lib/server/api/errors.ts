import type { ApiErrorBody, ApiErrorCode } from '#lib/api/types.ts';
import { localizeBackendMessage } from '#lib/api/messages.ts';

/** A non-2xx response (or a network failure) from the Spring API. */
export class ApiFailure extends Error {
	readonly status: number;
	readonly code: ApiErrorCode | string;
	readonly backendMessage: string;
	readonly fieldErrors: Record<string, string>;
	readonly correlationId: string | null;

	constructor(body: ApiErrorBody) {
		super(localizeBackendMessage(body.message, body.status));
		this.name = 'ApiFailure';
		this.status = body.status;
		this.code = body.error;
		this.backendMessage = body.message;
		this.fieldErrors = body.fieldErrors ?? {};
		this.correlationId = body.correlationId ?? null;
	}

	toAppError(): App.Error {
		return {
			status: this.status,
			message: this.message,
			code: this.code,
			correlationId: this.correlationId,
			fieldErrors: this.fieldErrors
		};
	}
}

export function isApiFailure(error: unknown): error is ApiFailure {
	return error instanceof ApiFailure;
}

/** Parse whatever the API returned on failure into an ApiErrorBody. */
export async function readErrorBody(response: Response, correlationId: string): Promise<ApiErrorBody> {
	const text = await response.text().catch(() => '');
	try {
		const parsed = JSON.parse(text) as Partial<ApiErrorBody>;
		if (parsed && typeof parsed.message === 'string') {
			return {
				status: response.status,
				error: parsed.error ?? 'INTERNAL_ERROR',
				message: parsed.message,
				correlationId: parsed.correlationId ?? correlationId,
				fieldErrors: parsed.fieldErrors ?? {}
			};
		}
	} catch {
		// not JSON
	}
	return {
		status: response.status,
		error: response.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN',
		message: response.statusText || `HTTP ${response.status}`,
		correlationId
	};
}
