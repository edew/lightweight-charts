import { strokeRectInnerWithFill } from '../helpers/canvas-helpers';

import type {SeriesItemsIndexesRange, TimedValue} from '../model/time-scale/time-data';
import type { BarCoordinates, BarPrices } from '../model/bar';

import type { IPaneRenderer } from './ipane-renderer';
import { optimalCandlestickWidth } from './optimal-bar-width';

export interface CandlestickItem extends TimedValue, BarPrices, BarCoordinates {
	color: string;
	borderColor: string;
	wickColor: string;
}

export interface PaneRendererCandlesticksData {
	bars: ReadonlyArray<CandlestickItem>;

	barSpacing: number;

	wickVisible: boolean;
	borderVisible: boolean;

	visibleRange: SeriesItemsIndexesRange | null;
}

const enum Constants {
	BarBorderWidth = 1,
}

export class PaneRendererCandlesticks implements IPaneRenderer {
	#data: PaneRendererCandlesticksData | null = null;

	// scaled with pixelRatio
	#barWidth: number = 0;

	public setData(data: PaneRendererCandlesticksData): void {
		this.#data = data;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void {
		if (this.#data === null || this.#data.bars.length === 0 || this.#data.visibleRange === null) {
			return;
		}

		// now we know pixelRatio and we could calculate barWidth effectively
		this.#barWidth = optimalCandlestickWidth(this.#data.barSpacing, pixelRatio);

		// grid and crosshair have line width = Math.floor(pixelRatio)
		// if this value is odd, we have to make candlesticks' width odd
		// if this value is even, we have to make candlesticks' width even
		// in order of keeping crosshair-over-candlesticks drawing symmetric
		if (this.#barWidth >= 2) {
			const wickWidth = Math.floor(pixelRatio);
			if ((wickWidth % 2) !== (this.#barWidth % 2)) {
				this.#barWidth--;
			}
		}

		const bars = this.#data.bars;
		if (this.#data.wickVisible) {
			this.#drawWicks(ctx, bars, this.#data.visibleRange, pixelRatio);
		}

		if (this.#data.borderVisible) {
			this.#drawBorder(ctx, bars, this.#data.visibleRange, this.#data.barSpacing, pixelRatio);
		}

		const borderWidth = this.#calculateBorderWidth(pixelRatio);

		if (!this.#data.borderVisible || this.#barWidth > borderWidth * 2) {
			this.#drawCandles(ctx, bars, this.#data.visibleRange, pixelRatio);
		}

	}

	#drawWicks(ctx: CanvasRenderingContext2D, bars: ReadonlyArray<CandlestickItem>, visibleRange: SeriesItemsIndexesRange, pixelRatio: number): void {
		if (this.#data === null) {
			return;
		}
		let prevWickColor = '';

		let wickWidth = Math.min(Math.floor(pixelRatio), Math.floor(this.#data.barSpacing * pixelRatio));
		wickWidth = Math.min(wickWidth, this.#barWidth);
		const wickOffset = Math.floor(wickWidth * 0.5);

		for (let i = visibleRange.from; i < visibleRange.to; i++) {
			const bar = bars[i];
			if (bar.wickColor !== prevWickColor) {
				ctx.fillStyle = bar.wickColor;
				prevWickColor = bar.wickColor;
			}

			const top = Math.round(Math.min(bar.openY, bar.closeY) * pixelRatio);
			const bottom = Math.round(Math.max(bar.openY, bar.closeY) * pixelRatio);

			const high = Math.round(bar.highY * pixelRatio);
			const low = Math.round(bar.lowY * pixelRatio);

			const scaledX = Math.round(pixelRatio * bar.x);

			ctx.fillRect(scaledX - wickOffset, high, wickWidth, top - high);
			ctx.fillRect(scaledX - wickOffset, bottom + 1, wickWidth, low - bottom);
		}
	}

	#calculateBorderWidth(pixelRatio: number): number {
		let borderWidth = Math.floor(Constants.BarBorderWidth * pixelRatio);
		if (this.#barWidth <= 2 * borderWidth) {
			borderWidth = Math.floor((this.#barWidth  - 1) * 0.5);
		}
		const res = Math.max(1, borderWidth);
		if (this.#barWidth <= res * 2) {
			// do not draw bodies, restore original value
			return Math.floor(Constants.BarBorderWidth * pixelRatio);
		}
		return res;
	}

	#drawBorder(ctx: CanvasRenderingContext2D, bars: ReadonlyArray<CandlestickItem>, visibleRange: SeriesItemsIndexesRange, barSpacing: number, pixelRatio: number): void {
		let prevBorderColor = '';
		const borderWidth = this.#calculateBorderWidth(pixelRatio);

		for (let i = visibleRange.from; i < visibleRange.to; i++) {
			const bar = bars[i];
			if (bar.borderColor !== prevBorderColor) {
				ctx.fillStyle = bar.borderColor;
				prevBorderColor = bar.borderColor;
			}

			const left = Math.round(bar.x * pixelRatio) - Math.floor(this.#barWidth * 0.5);
			const right = left + this.#barWidth - 1;

			const top = Math.round(Math.min(bar.openY, bar.closeY) * pixelRatio);
			const bottom = Math.round(Math.max(bar.openY, bar.closeY) * pixelRatio);

			if (barSpacing > 2 * borderWidth) {
				strokeRectInnerWithFill(ctx, left, top, right - left + 1, bottom - top + 1, borderWidth);
			} else {
				ctx.fillRect(left, top, right - left + 1, bottom - top + 1);
			}
		}
	}

	#drawCandles(ctx: CanvasRenderingContext2D, bars: ReadonlyArray<CandlestickItem>, visibleRange: SeriesItemsIndexesRange, pixelRatio: number): void {
		if (this.#data === null) {
			return;
		}

		let prevBarColor = '';

		const borderWidth = this.#calculateBorderWidth(pixelRatio);

		for (let i = visibleRange.from; i < visibleRange.to; i++) {
			const bar = bars[i];
			let top = Math.round(Math.min(bar.openY, bar.closeY) * pixelRatio);
			let bottom = Math.round(Math.max(bar.openY, bar.closeY) * pixelRatio);

			let left = Math.round(bar.x * pixelRatio) - Math.floor(this.#barWidth * 0.5);
			let right = left + this.#barWidth - 1;

			if (this.#data.borderVisible) {
				left += borderWidth;
				top += borderWidth;
				right -= borderWidth;
				bottom -= borderWidth;
			}

			if (top > bottom) {
				continue;
			}

			if (bar.color !== prevBarColor) {
				const barColor = bar.color;
				ctx.fillStyle = barColor;
				prevBarColor = barColor;
			}

			ctx.fillRect(left, top, right - left + 1, bottom - top + 1);
		}
	}
}
