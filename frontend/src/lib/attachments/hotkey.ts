import type { Attachment } from 'svelte/attachments';

/** Parse "mod+k" / "shift+/" style combos. `mod` = Cmd on macOS, Ctrl elsewhere. */
export function matchesHotkey(event: KeyboardEvent, combo: string): boolean {
	const parts = combo.toLowerCase().split('+');
	const key = parts.pop();
	const wantMod = parts.includes('mod');
	const wantShift = parts.includes('shift');
	const wantAlt = parts.includes('alt');
	const mod = event.metaKey || event.ctrlKey;
	return (
		event.key.toLowerCase() === key && mod === wantMod && event.shiftKey === wantShift && event.altKey === wantAlt
	);
}

function isTyping(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
	);
}

/**
 * `{@attach hotkey('mod+k', handler)}` on any element (usually `<svelte:window>`).
 * Plain keys (no modifier) are ignored while typing in a field.
 */
export function hotkey(combo: string, handler: (event: KeyboardEvent) => void): Attachment<EventTarget> {
	return (node) => {
		const listener = (event: Event) => {
			const keyEvent = event as KeyboardEvent;
			if (!matchesHotkey(keyEvent, combo)) return;
			if (!combo.includes('mod') && isTyping(keyEvent.target)) return;
			keyEvent.preventDefault();
			handler(keyEvent);
		};
		node.addEventListener('keydown', listener);
		return () => node.removeEventListener('keydown', listener);
	};
}
