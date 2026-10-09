import { createContext } from 'svelte';
import type { SessionUser } from '#lib/api/types.ts';

/** The signed-in user, provided by the (app) layout. */
export const [getUser, setUser] = createContext<() => SessionUser>();
