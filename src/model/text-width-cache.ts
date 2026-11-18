const defaultReplacementRe = /[2-9]/g;

/**
 * Remembers the width of the last measured texts. Digits are replaced with "0" before
 * a measurement, so that all prices with the same number of digits share one entry.
 * When the cache is full, the entry that was added first is removed.
 */
export class TextWidthCache {
	readonly #maxSize: number;
	// a Map keeps the order in which the keys were added
	readonly #cache: Map<string, number> = new Map();
	// the last text and its width: the same label is measured many times in a row
	#lastText: string = '';
	#lastRe: RegExp | undefined;
	#lastWidth: number = 0;

	public constructor(size: number = 50) {
		this.#maxSize = size;
	}

	public reset(): void {
		this.#cache.clear();
		this.#lastText = '';
		this.#lastWidth = 0;
	}

	public measureText(ctx: CanvasRenderingContext2D, text: string, optimizationReplacementRe?: RegExp): number {
		if (text === this.#lastText && optimizationReplacementRe === this.#lastRe && this.#lastWidth !== 0) {
			return this.#lastWidth;
		}

		const cacheString = String(text).replace(optimizationReplacementRe || defaultReplacementRe, '0');

		let width = this.#cache.get(cacheString);
		if (width === undefined) {
			width = ctx.measureText(cacheString).width;
			if (width === 0 && text.length !== 0) {
				// measureText can return 0 in FF depending on a canvas size, don't cache it
				return 0;
			}

			if (this.#cache.size === this.#maxSize) {
				this.#cache.delete(this.#cache.keys().next().value as string);
			}
			this.#cache.set(cacheString, width);
		}

		this.#lastText = text;
		this.#lastRe = optimizationReplacementRe;
		this.#lastWidth = width;
		return width;
	}
}
