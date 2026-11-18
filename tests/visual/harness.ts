import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import pixelmatch from 'pixelmatch';

import { testFontFamily } from '../helpers/headless-chart';

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = resolve(here, 'golden');
const outDir = resolve(here, 'out');
const fontPath = resolve(here, '../../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf');

// One font for all cases. A system font gives different pixels on each computer.
GlobalFonts.registerFromPath(fontPath, testFontFamily);

export type DrawFn = (ctx: CanvasRenderingContext2D, pixelRatio: number) => void;

export interface RenderedCase {
	width: number;
	height: number;
	png: Buffer;
	rgba: Uint8ClampedArray;
}

export function renderCase(width: number, height: number, pixelRatio: number, draw: DrawFn): RenderedCase {
	const bitmapWidth = Math.ceil(width * pixelRatio);
	const bitmapHeight = Math.ceil(height * pixelRatio);
	const canvas = createCanvas(bitmapWidth, bitmapHeight);
	const ctx = canvas.getContext('2d');
	draw(ctx as unknown as CanvasRenderingContext2D, pixelRatio);
	return {
		width: bitmapWidth,
		height: bitmapHeight,
		png: canvas.toBuffer('image/png'),
		rgba: ctx.getImageData(0, 0, bitmapWidth, bitmapHeight).data,
	};
}

export interface GoldenOptions {
	/** pixelmatch color threshold, 0 = exact. */
	threshold?: number;
	/** Number of different pixels that is permitted. */
	maxDiffPixels?: number;
}

export interface GoldenResult {
	pass: boolean;
	message: string;
}

export async function compareWithGolden(name: string, actual: RenderedCase, options: GoldenOptions = {}): Promise<GoldenResult> {
	const goldenPath = resolve(goldenDir, `${name}.png`);

	if (process.env.UPDATE_GOLDEN === '1') {
		mkdirSync(goldenDir, { recursive: true });
		writeFileSync(goldenPath, actual.png);
		return { pass: true, message: 'golden image written' };
	}

	if (!existsSync(goldenPath)) {
		return { pass: false, message: `no golden image for "${name}". Run with UPDATE_GOLDEN=1 to record it.` };
	}

	const image = await loadImage(readFileSync(goldenPath));
	if (image.width !== actual.width || image.height !== actual.height) {
		return { pass: false, message: `"${name}": size is ${actual.width}x${actual.height}, golden is ${image.width}x${image.height}` };
	}

	const goldenCanvas = createCanvas(image.width, image.height);
	const goldenCtx = goldenCanvas.getContext('2d');
	goldenCtx.drawImage(image, 0, 0);
	const golden = goldenCtx.getImageData(0, 0, image.width, image.height).data;

	const diff = new Uint8ClampedArray(actual.rgba.length);
	const diffPixels = pixelmatch(golden, actual.rgba, diff, actual.width, actual.height, {
		threshold: options.threshold ?? 0,
		includeAA: true,
	});

	if (diffPixels <= (options.maxDiffPixels ?? 0)) {
		return { pass: true, message: '' };
	}

	mkdirSync(outDir, { recursive: true });
	writeFileSync(resolve(outDir, `${name}.actual.png`), actual.png);
	const diffCanvas = createCanvas(actual.width, actual.height);
	const diffCtx = diffCanvas.getContext('2d');
	const diffImage = diffCtx.createImageData(actual.width, actual.height);
	diffImage.data.set(diff);
	diffCtx.putImageData(diffImage, 0, 0);
	writeFileSync(resolve(outDir, `${name}.diff.png`), diffCanvas.toBuffer('image/png'));

	return { pass: false, message: `"${name}": ${diffPixels} pixels are different. See tests/visual/out/${name}.diff.png` };
}
