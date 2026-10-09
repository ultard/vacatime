/// <reference lib="webworker" />
import { createGridEngine, type GridEngine } from './engine.ts';

let engine: GridEngine | null = null;
let running = false;

const loop = (time: number) => {
	if (!running || !engine) return;
	engine.frame(time / 1000);
	requestAnimationFrame(loop);
};

self.onmessage = (event: MessageEvent) => {
	const msg = event.data;
	switch (msg.type) {
		case 'init': {
			const canvas = msg.canvas as OffscreenCanvas;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			engine = createGridEngine(ctx, (w, h) => new OffscreenCanvas(w, h), { dark: msg.dark, reduced: msg.reduced });
			engine.resize(msg.width, msg.height, msg.dpr);
			if (!msg.reduced) {
				running = true;
				requestAnimationFrame(loop);
			}
			break;
		}
		case 'resize':
			engine?.resize(msg.width, msg.height, msg.dpr);
			break;
		case 'pointer':
			engine?.pointer(msg.x, msg.y);
			break;
		case 'mood':
			engine?.setMood(msg.mood);
			break;
		case 'dark':
			engine?.setDark(msg.dark);
			break;
		case 'pause':
			running = false;
			break;
		case 'resume':
			if (!running && engine) {
				running = true;
				requestAnimationFrame(loop);
			}
			break;
	}
};
