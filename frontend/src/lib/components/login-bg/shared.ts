/**
 * Drive a render loop that pauses while the tab is hidden. Returns a stop function.
 */
export function runLoop(frame: (time: number, dt: number) => void) {
	let raf = 0;
	let last = performance.now();
	const tick = (now: number) => {
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		frame(now / 1000, dt);
		raf = requestAnimationFrame(tick);
	};
	const onVisibility = () => {
		cancelAnimationFrame(raf);
		if (document.visibilityState === 'visible') {
			last = performance.now();
			raf = requestAnimationFrame(tick);
		}
	};
	document.addEventListener('visibilitychange', onVisibility);
	raf = requestAnimationFrame(tick);
	return () => {
		cancelAnimationFrame(raf);
		document.removeEventListener('visibilitychange', onVisibility);
	};
}
