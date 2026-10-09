import { overwriteGetLocale } from '#lib/paraglide/runtime.js';

// Component tests assert Russian copy regardless of the browser language.
overwriteGetLocale(() => 'ru');
