import { m } from '#lib/paraglide/messages.js';

export interface ErrorInfo {
	status: number;
	message: string;
	code?: string;
	correlationId?: string | null;
}

/** Normalise errors thrown by remote functions (HttpError with `body`) and anything else. */
export function errorInfo(error: unknown): ErrorInfo {
	if (error && typeof error === 'object') {
		const body = (error as { body?: Partial<App.Error> }).body;
		if (body && typeof body.message === 'string') {
			return {
				status: body.status ?? (error as { status?: number }).status ?? 500,
				message: body.message,
				code: body.code,
				correlationId: body.correlationId
			};
		}
		if ('message' in error && typeof error.message === 'string' && 'status' in error) {
			return { status: Number(error.status), message: error.message };
		}
	}
	return { status: 500, message: m.err_unknown() };
}

export function errorMessage(error: unknown): string {
	return errorInfo(error).message;
}
