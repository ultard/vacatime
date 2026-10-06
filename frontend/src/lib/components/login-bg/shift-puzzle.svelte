<script lang="ts">
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { Mood } from './types.ts';
	import { createGridEngine, type GridEngine } from './engine.ts';
	import { runLoop } from './shared.ts';

	let {
		mood,
		reducedMotion,
		dark,
		onfail
	}: { mood: Mood; reducedMotion: boolean; dark: boolean; onfail?: () => void } = $props();

	/** Either a worker (OffscreenCanvas) or a main-thread engine, behind one tiny interface. */
	let send: ((msg: Record<string, unknown>) => void) | null = null;

	$effect(() => {
		send?.({ type: 'mood', mood });
	});
	$effect(() => {
		send?.({ type: 'dark', dark });
	});

	const scene: Attachment<HTMLCanvasElement> = (canvas) => {
		// Read initial values untracked: the canvas can be transferred to a worker only once.
		const reduced = untrack(() => reducedMotion);
		const initialDark = untrack(() => dark);
		const dpr = Math.min(devicePixelRatio, 2);
		const size = () => ({ width: canvas.clientWidth, height: canvas.clientHeight, dpr });
		let cleanup: () => void;

		const offscreenOk = 'transferControlToOffscreen' in canvas && typeof Worker !== 'undefined';
		if (offscreenOk) {
			const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
			const offscreen = canvas.transferControlToOffscreen();
			worker.postMessage({ type: 'init', canvas: offscreen, dark: initialDark, reduced, ...size() }, [offscreen]);
			worker.onerror = () => onfail?.();
			send = (msg) => worker.postMessage(msg);
			const onVisibility = () => send?.({ type: document.hidden ? 'pause' : 'resume' });
			document.addEventListener('visibilitychange', onVisibility);
			cleanup = () => {
				document.removeEventListener('visibilitychange', onVisibility);
				worker.terminate();
			};
		} else {
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				onfail?.();
				return;
			}
			const engine: GridEngine = createGridEngine(ctx, (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }), {
				dark: initialDark,
				reduced
			});
			engine.resize(canvas.clientWidth, canvas.clientHeight, dpr);
			send = (msg) => {
				if (msg.type === 'resize') engine.resize(msg.width as number, msg.height as number, msg.dpr as number);
				if (msg.type === 'pointer') engine.pointer(msg.x as number, msg.y as number);
				if (msg.type === 'mood') engine.setMood(msg.mood as never);
				if (msg.type === 'dark') engine.setDark(msg.dark as boolean);
			};
			const stop = reduced ? () => {} : runLoop((time) => engine.frame(time));
			cleanup = stop;
		}

		const onMove = (event: PointerEvent) => send?.({ type: 'pointer', x: event.clientX, y: event.clientY });
		const observer = new ResizeObserver(() => send?.({ type: 'resize', ...size() }));
		observer.observe(canvas);
		addEventListener('pointermove', onMove);

		return () => {
			observer.disconnect();
			removeEventListener('pointermove', onMove);
			cleanup();
			send = null;
		};
	};
</script>

<canvas {@attach scene} class="absolute inset-0 size-full"></canvas>
