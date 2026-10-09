import type { SessionUser } from '#lib/api/types.ts';
import type { Session } from '#lib/server/api/session.ts';

declare global {
	namespace App {
		interface Error {
			status: number;
			message: string;
			code?: string;
			correlationId?: string | null;
			fieldErrors?: Record<string, string>;
		}
		interface Locals {
			session: Session;
			user: SessionUser | null;
			correlationId: string;
		}
		interface PageState {
			/** Vacation opened in the drawer via shallow routing. */
			vacationId?: string;
		}
	}
}

export {};
