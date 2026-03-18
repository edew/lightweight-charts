const defaultReplacementRe = /[2-9]/g;

export class TextWidthCache {
	readonly #maxSize: number;
	#actualSize: number = 0;
	#usageTick: number = 1;
	#oldestTick: number = 1;
	#tick2Labels: Record<number, string> = {};
	#cache: Record<string, { width: number; tick: number }> = {};

	public constructor(size: number = 50) {
		this.#maxSize = size;
	}

	public reset(): void {
		this.#actualSize = 0;
		this.#cache = {};
		this.#usageTick = 1;
		this.#oldestTick = 1;
		this.#tick2Labels = {};
	}

	public measureText(ctx: CanvasRenderingContext2D, text: string, optimizationReplacementRe?: RegExp): number {
		const re = optimizationReplacementRe || defaultReplacementRe;
		const cacheString = String(text).replace(re, '0');

		if (this.#cache[cacheString]) {
			return this.#cache[cacheString].width;
		}

		if (this.#actualSize === this.#maxSize) {
			const oldestValue = this.#tick2Labels[this.#oldestTick];
			delete this.#tick2Labels[this.#oldestTick];
			delete this.#cache[oldestValue];
			this.#oldestTick++;
			this.#actualSize--;
		}

		const width = ctx.measureText(cacheString).width;

		if (width === 0 && !!text.length) {
			// measureText can return 0 in FF depending on a canvas size, don't cache it
			return 0;
		}

		this.#cache[cacheString] = { width: width, tick: this.#usageTick };
		this.#tick2Labels[this.#usageTick] = cacheString;
		this.#actualSize++;
		this.#usageTick++;
		return width;
	}
}
