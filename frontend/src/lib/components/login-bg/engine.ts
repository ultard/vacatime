/**
 * "Shift puzzle" background: thousands of day cells that flow into vacation silhouettes.
 * Pure drawing logic, usable on the main thread or inside a worker with OffscreenCanvas.
 */
import type { Mood } from './types.ts';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Rgb = [number, number, number];

const PITCH = 18;
const GAP = 3;
const SHAPES = ['🌴', '🌊', '☀️', '🧳', '✈️', '🏖️', '⛰️', '🍹'];
const SWAP_EVERY = 5;

interface Cell {
	x: number;
	y: number;
	color: Rgb;
	from: Rgb;
	to: Rgb;
	start: number;
	duration: number;
	dx: number;
	dy: number;
	vx: number;
	vy: number;
	fall: number;
	glow: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
	return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

const PALETTE = {
	light: {
		bg: [246, 241, 231] as Rgb,
		work: [[205, 222, 230], [190, 212, 224], [214, 226, 232], [176, 202, 218]] as Rgb[],
		vacation: [[255, 196, 92], [255, 150, 84], [244, 112, 96], [255, 220, 140]] as Rgb[],
		error: [226, 84, 76] as Rgb
	},
	dark: {
		bg: [16, 20, 36] as Rgb,
		work: [[30, 42, 66], [36, 50, 78], [26, 36, 58], [44, 58, 88]] as Rgb[],
		vacation: [[255, 176, 72], [250, 120, 80], [236, 88, 110], [255, 206, 120]] as Rgb[],
		error: [220, 60, 70] as Rgb
	}
};

export interface GridEngine {
	resize(width: number, height: number, dpr: number): void;
	pointer(x: number, y: number): void;
	setMood(mood: Mood): void;
	setDark(dark: boolean): void;
	frame(time: number): void;
}

export function createGridEngine(
	ctx: Ctx,
	makeCanvas: (w: number, h: number) => OffscreenCanvas | HTMLCanvasElement,
	options: { dark: boolean; reduced: boolean }
): GridEngine {
	let width = 0;
	let height = 0;
	let dpr = 1;
	let cols = 0;
	let rows = 0;
	let cells: Cell[] = [];
	let dark = options.dark;
	let mood: Mood = 'idle';
	let moodSince = 0;
	let now = 0;
	let shapeIndex = Math.floor(Math.random() * SHAPES.length);
	let nextSwap = 0;
	const mouse = { x: -1e4, y: -1e4 };
	const palette = () => (dark ? PALETTE.dark : PALETTE.light);

	/** Coverage mask (0..1 per cell) of an emoji silhouette centred at (cx, cy) in cell units. */
	function mask(shape: string, cx: number, cy: number, size: number): Float32Array {
		const canvas = makeCanvas(cols, rows);
		const c = canvas.getContext('2d') as Ctx | null;
		const out = new Float32Array(cols * rows);
		if (!c) return out;
		c.clearRect(0, 0, cols, rows);
		c.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		c.fillText(shape, cx, cy);
		const data = c.getImageData(0, 0, cols, rows).data;
		let covered = 0;
		for (let i = 0; i < out.length; i++) {
			const a = data[i * 4 + 3] / 255;
			const lum = (data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11) / 255;
			out[i] = a > 0.35 ? 0.35 + lum * 0.65 : 0;
			if (out[i]) covered++;
		}
		// No emoji font (e.g. CI): fall back to a geometric sun.
		if (covered < out.length * 0.01) {
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					const d = Math.hypot(x - cx, y - cy) / (size * 0.45);
					out[y * cols + x] = d < 1 ? 1 - d * 0.5 : 0;
				}
			}
		}
		return out;
	}

	function targetFor(index: number, left: Float32Array, right: Float32Array): Rgb {
		const p = palette();
		const v = Math.max(left[index], right[index]);
		if (v > 0) {
			const tone = p.vacation[Math.min(p.vacation.length - 1, Math.floor(v * p.vacation.length))];
			return tone;
		}
		return p.work[(index * 7 + (index % cols) * 3) % p.work.length];
	}

	function retarget(origin: { x: number; y: number }, spread = 0.012) {
		const size = Math.min(rows * 0.75, cols * 0.42);
		const a = SHAPES[shapeIndex % SHAPES.length];
		const b = SHAPES[(shapeIndex + 3) % SHAPES.length];
		const left = mask(a, cols * 0.2, rows * 0.55, size);
		const right = mask(b, cols * 0.8, rows * 0.45, size * 0.85);
		cells.forEach((cell, i) => {
			cell.from = [...cell.color];
			cell.to = targetFor(i, left, right);
			cell.start = now + Math.hypot(cell.x - origin.x, cell.y - origin.y) * spread * (options.reduced ? 0 : 1) / PITCH;
			cell.duration = 0.6 + Math.random() * 0.5;
		});
	}

	function build() {
		cols = Math.ceil(width / PITCH) + 1;
		rows = Math.ceil(height / PITCH) + 1;
		const p = palette();
		cells = [];
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				const base = p.work[(x * 3 + y * 5) % p.work.length];
				cells.push({
					x: x * PITCH + PITCH / 2,
					y: y * PITCH + PITCH / 2,
					color: [...base],
					from: [...base],
					to: [...base],
					start: 0,
					duration: 1,
					dx: 0,
					dy: 0,
					vx: 0,
					vy: 0,
					fall: 0,
					glow: 0
				});
			}
		}
		retarget({ x: width / 2, y: height / 2 }, 0.02);
		nextSwap = now + SWAP_EVERY;
	}

	function draw(dt: number) {
		const p = palette();
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = `rgb(${p.bg.join(',')})`;
		ctx.fillRect(0, 0, width, height);
		const size = PITCH - GAP;
		const sinceMood = now - moodSince;
		const errorTint = mood === 'error' ? Math.max(0, 1 - sinceMood / 1.4) : 0;

		for (const cell of cells) {
			// colour transition
			const t = Math.min(1, Math.max(0, (now - cell.start) / cell.duration));
			cell.color = mixRgb(cell.from, cell.to, ease(t));

			// cursor repulsion (spring back to rest)
			let tx = 0;
			let ty = 0;
			const mx = cell.x - mouse.x;
			const my = cell.y - mouse.y;
			const dist = Math.hypot(mx, my);
			if (dist < 140 && dist > 0.1) {
				const push = (1 - dist / 140) * 16;
				tx = (mx / dist) * push;
				ty = (my / dist) * push;
			}
			cell.vx += ((tx - cell.dx) * 120 - cell.vx * 14) * dt;
			cell.vy += ((ty - cell.dy) * 120 - cell.vy * 14) * dt;
			if (cell.fall > 0) {
				cell.vy += 900 * dt;
				cell.fall -= dt;
			}
			cell.dx += cell.vx * dt;
			cell.dy += cell.vy * dt;
			cell.glow = Math.max(0, cell.glow - dt * 1.5);

			let color = cell.color;
			if (errorTint > 0) color = mixRgb(color, p.error, errorTint * 0.7);
			if (cell.glow > 0) color = mixRgb(color, [255, 255, 255], cell.glow * 0.6);
			const scale = 1 - Math.min(0.35, Math.hypot(cell.dx, cell.dy) / 60);
			const s = size * scale;
			ctx.fillStyle = `rgb(${color[0] | 0},${color[1] | 0},${color[2] | 0})`;
			ctx.beginPath();
			ctx.roundRect(cell.x + cell.dx - s / 2, cell.y + cell.dy - s / 2, s, s, 4);
			ctx.fill();
		}
	}

	return {
		resize(w, h, ratio) {
			width = w;
			height = h;
			dpr = ratio;
			ctx.canvas.width = Math.round(w * ratio);
			ctx.canvas.height = Math.round(h * ratio);
			build();
			if (options.reduced) {
				for (const cell of cells) cell.color = [...cell.to];
				draw(0);
			}
		},
		pointer(x, y) {
			mouse.x = x;
			mouse.y = y;
		},
		setMood(next) {
			if (next === mood) return;
			mood = next;
			moodSince = now;
			if (next === 'error') {
				for (const cell of cells) if (Math.random() < 0.12) cell.fall = 0.35 + Math.random() * 0.3;
			} else if (next === 'success') {
				const p = palette();
				cells.forEach((cell, i) => {
					cell.from = [...cell.color];
					cell.to = p.vacation[i % p.vacation.length];
					cell.start = now + Math.hypot(cell.x - width / 2, cell.y - height / 2) * 0.0015;
					cell.duration = 0.5;
				});
				nextSwap = Infinity;
			} else if (next === 'idle' && nextSwap === Infinity) {
				nextSwap = now;
			}
			if (options.reduced) draw(0);
		},
		setDark(value) {
			dark = value;
			retarget({ x: width / 2, y: height / 2 }, 0.004);
			if (options.reduced) {
				for (const cell of cells) cell.color = [...cell.to];
				draw(0);
			}
		},
		frame(time) {
			const dt = Math.min(0.05, now ? time - now : 0.016);
			now = time;
			if (now >= nextSwap) {
				shapeIndex++;
				retarget({ x: Math.random() * width, y: Math.random() * height });
				nextSwap = now + SWAP_EVERY;
			}
			if (mood === 'typing' && Math.random() < 0.6) {
				const cell = cells[Math.floor(Math.random() * cells.length)];
				if (cell) cell.glow = 1;
			}
			draw(dt);
		}
	};
}
