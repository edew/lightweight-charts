import { createPreconfiguredCanvas, getCanvasDevicePixelRatio, getContext2D, Size } from '../gui/canvas-utils';

import { ensureDefined } from '../helpers/assertions';
import { drawScaled } from '../helpers/canvas-helpers';
import type { IDestroyable } from '../helpers/idestroyable';
import { makeFont } from '../helpers/make-font';
import { ceiledEven } from '../helpers/mathex';

import { TextWidthCache } from '../model/text-width-cache';

const MAX_COUNT = 200;

interface Item {
	text: string;
	textWidth: number;
	width: number;
	height: number;
	canvas: HTMLCanvasElement;
}

export class LabelsImageCache implements IDestroyable {
	#textWidthCache: TextWidthCache = new TextWidthCache(MAX_COUNT);
	#fontSize: number = 0;
	#color: string = '';
	#font: string = '';
	#keys: string[] = [];
	#hash: Map<string, Item> = new Map();

	public constructor(fontSize: number, color: string, fontFamily?: string, fontStyle?: string) {
		this.#fontSize = fontSize;
		this.#color = color;
		this.#font = makeFont(fontSize, fontFamily, fontStyle);
	}

	public destroy(): void {
		(this.#textWidthCache as unknown as null) = null;
		this.#keys = [];
		this.#hash.clear();
	}

	public paintTo(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: string): void {
		const label = this.#getLabelImage(ctx, text);
		if (align !== 'left') {
			const pixelRatio = getCanvasDevicePixelRatio(ctx.canvas);
			x -= Math.floor(label.textWidth * pixelRatio);
		}

		y -= Math.floor(label.height / 2);

		ctx.drawImage(
			label.canvas,
			x, y,
			label.width, label.height
		);
	}

	#getLabelImage(ctx: CanvasRenderingContext2D, text: string): Item {
		let item: Item;
		if (this.#hash.has(text)) {
			// Cache hit!
			item = ensureDefined(this.#hash.get(text));
		} else {
			if (this.#keys.length >= MAX_COUNT) {
				const key = ensureDefined(this.#keys.shift());
				this.#hash.delete(key);
			}

			const pixelRatio = getCanvasDevicePixelRatio(ctx.canvas);

			const margin = Math.ceil(this.#fontSize / 4.5);
			const baselineOffset = Math.round(this.#fontSize / 10);
			const textWidth = Math.ceil(this.#textWidthCache.measureText(ctx, text));
			const width = ceiledEven(Math.round(textWidth + margin * 2));
			const height = ceiledEven(this.#fontSize + margin * 2);
			const canvas = createPreconfiguredCanvas(document, new Size(width, height));

			// Allocate new
			item = {
				text: text,
				textWidth: Math.round(Math.max(1, textWidth)),
				width: Math.ceil(width * pixelRatio),
				height: Math.ceil(height * pixelRatio),
				canvas: canvas,
			};

			if (textWidth !== 0) {
				this.#keys.push(item.text);
				this.#hash.set(item.text, item);
			}

			ctx = getContext2D(item.canvas);
			drawScaled(ctx, pixelRatio, () => {
				ctx.font = this.#font;
				ctx.fillStyle = this.#color;
				ctx.fillText(text, 0, height - margin - baselineOffset);
			});
		}

		return item;
	}
}
