import { hairline } from '../draw/line-style';

import type { SeriesDrawData, SeriesKind, SeriesSpec } from '../model/series-kind';
import type { CandlestickSeriesOptions, CandlestickSeriesPartialOptions, CandlestickStyleOptions } from '../model/series-options';

const candlestickStyleDefaults: CandlestickStyleOptions = {
	upColor: '#26a69a',
	downColor: '#ef5350',
	wickVisible: true,
	borderVisible: true,
	borderColor: '#378658',
	borderUpColor: '#26a69a',
	borderDownColor: '#ef5350',
	wickColor: '#737375',
	wickUpColor: '#26a69a',
	wickDownColor: '#ef5350',
};

const BAR_BORDER_WIDTH = 1;

/** Width of a candle body in device pixels. */
function candlestickWidth(barSpacing: number, pixelRatio: number): number {
	const res = Math.floor(barSpacing * 0.8 * pixelRatio);
	const scaledBarSpacing = Math.floor(barSpacing * pixelRatio);
	const optimal = Math.min(res, scaledBarSpacing - 1);
	let barWidth = Math.max(1, optimal);

	// the candle width must be odd or even as the wick width is, so that the wick is in the center
	if (barWidth >= 2) {
		const wickWidth = hairline(pixelRatio);
		if ((wickWidth % 2) !== (barWidth % 2)) {
			barWidth--;
		}
	}

	return barWidth;
}

function borderWidthFor(barWidth: number, pixelRatio: number): number {
	let borderWidth = Math.floor(BAR_BORDER_WIDTH * pixelRatio);
	if (barWidth <= 2 * borderWidth) {
		borderWidth = Math.floor((barWidth - 1) * 0.5);
	}
	const res = Math.max(1, borderWidth);
	if (barWidth <= res * 2) {
		// do not draw bodies, restore original value
		return Math.floor(BAR_BORDER_WIDTH * pixelRatio);
	}
	return res;
}

// All loops read open (0), high (1), low (2), close (3) of each bar from `ys` and `values`.
// `fillStyle` is written only when the color changes from one bar to the next.

function draw(ctx: CanvasRenderingContext2D, data: SeriesDrawData, options: CandlestickSeriesOptions): void {
	const count = data.count;
	if (count === 0) {
		return;
	}

	const pixelRatio = data.pixelRatio;
	const xs = data.xs;
	const ys = data.ys;
	const values = data.values;
	const firstValue = data.firstRow * 4;
	const barWidth = candlestickWidth(data.barSpacing, pixelRatio);
	const borderWidth = borderWidthFor(barWidth, pixelRatio);
	const halfBarWidth = Math.floor(barWidth * 0.5);
	const borderVisible = options.borderVisible;

	if (options.wickVisible) {
		let wickWidth = Math.max(1, Math.min(Math.floor(pixelRatio), Math.floor(data.barSpacing * pixelRatio)));
		wickWidth = Math.min(wickWidth, barWidth);
		const wickOffset = Math.floor(wickWidth * 0.5);
		const upColor = options.wickUpColor;
		const downColor = options.wickDownColor;
		let prevColor = '';

		for (let i = 0; i < count; i++) {
			const o = i * 4;
			const color = values[firstValue + o] <= values[firstValue + o + 3] ? upColor : downColor;
			if (color !== prevColor) {
				ctx.fillStyle = color;
				prevColor = color;
			}

			const openY = ys[o];
			const closeY = ys[o + 3];
			const top = Math.round(Math.min(openY, closeY) * pixelRatio);
			const bottom = Math.round(Math.max(openY, closeY) * pixelRatio);
			const high = Math.round(ys[o + 1] * pixelRatio);
			const low = Math.round(ys[o + 2] * pixelRatio);
			const scaledX = Math.round(pixelRatio * xs[i]);

			ctx.fillRect(scaledX - wickOffset, high, wickWidth, top - high);
			ctx.fillRect(scaledX - wickOffset, bottom + 1, wickWidth, low - bottom);
		}
	}

	if (borderVisible) {
		const upColor = options.borderUpColor;
		const downColor = options.borderDownColor;
		const hollow = data.barSpacing * pixelRatio > 2 * borderWidth;
		let prevColor = '';

		for (let i = 0; i < count; i++) {
			const o = i * 4;
			const color = values[firstValue + o] <= values[firstValue + o + 3] ? upColor : downColor;
			if (color !== prevColor) {
				ctx.fillStyle = color;
				prevColor = color;
			}

			const left = Math.round(xs[i] * pixelRatio) - halfBarWidth;
			const openY = ys[o];
			const closeY = ys[o + 3];
			const top = Math.round(Math.min(openY, closeY) * pixelRatio);
			const bottom = Math.round(Math.max(openY, closeY) * pixelRatio);
			const height = bottom - top + 1;

			if (hollow) {
				// four rectangles that do not overlap at the corners (for colors with transparency)
				ctx.fillRect(left, top, borderWidth, height);
				ctx.fillRect(left + borderWidth, top, barWidth - borderWidth * 2, borderWidth);
				ctx.fillRect(left + borderWidth, top + height - borderWidth, barWidth - borderWidth * 2, borderWidth);
				ctx.fillRect(left + barWidth - borderWidth, top, borderWidth, height);
			} else {
				ctx.fillRect(left, top, barWidth, height);
			}
		}
	}

	if (!borderVisible || barWidth > borderWidth * 2) {
		const upColor = options.upColor;
		const downColor = options.downColor;
		const inset = borderVisible ? borderWidth : 0;
		let prevColor = '';

		for (let i = 0; i < count; i++) {
			const o = i * 4;
			const openY = ys[o];
			const closeY = ys[o + 3];
			const top = Math.round(Math.min(openY, closeY) * pixelRatio) + inset;
			const bottom = Math.round(Math.max(openY, closeY) * pixelRatio) - inset;
			if (top > bottom) {
				continue;
			}

			const color = values[firstValue + o] <= values[firstValue + o + 3] ? upColor : downColor;
			if (color !== prevColor) {
				ctx.fillStyle = color;
				prevColor = color;
			}

			const left = Math.round(xs[i] * pixelRatio) - halfBarWidth + inset;
			ctx.fillRect(left, top, barWidth - inset * 2, bottom - top + 1);
		}
	}
}

function range(values: Float64Array, fromRow: number, toRow: number, out: Float64Array): void {
	let min = Infinity;
	let max = -Infinity;
	for (let row = fromRow; row < toRow; row++) {
		const high = values[row * 4 + 1];
		const low = values[row * 4 + 2];
		if (low < min) {
			min = low;
		}
		if (high > max) {
			max = high;
		}
	}
	out[0] = min;
	out[1] = max;
}

function barColor(values: Float64Array, row: number, options: CandlestickSeriesOptions): string {
	return values[row * 4] <= values[row * 4 + 3] ? options.upColor : options.downColor;
}

function normalizeOptions(options: CandlestickSeriesPartialOptions): void {
	if (options.borderColor !== undefined) {
		options.borderUpColor = options.borderColor;
		options.borderDownColor = options.borderColor;
	}

	if (options.wickColor !== undefined) {
		options.wickUpColor = options.wickColor;
		options.wickDownColor = options.wickColor;
	}
}

const candlestickKind: SeriesKind<'Candlestick'> = {
	type: 'Candlestick',
	stride: 4,
	defaults: candlestickStyleDefaults,
	extendRange: false,
	draw,
	range,
	barColor,
	normalizeOptions,
};

/** A candlestick series: open, high, low and close for each time point. Use with `chart.addSeries(Candlestick({ ... }))`. */
export function Candlestick(options: CandlestickSeriesPartialOptions = {}): SeriesSpec<'Candlestick'> {
	return { kind: candlestickKind, options };
}
