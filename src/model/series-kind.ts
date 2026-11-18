import type { SeriesOptionsMap, SeriesPartialOptionsMap, SeriesType } from './series-options';

/**
 * The data that a series kind needs to draw the visible bars of one series.
 * The arrays are scratch buffers that all series share: do not keep them.
 */
export interface SeriesDrawData {
	/** Number of bars to draw. */
	count: number;
	/** x of the center of each bar, CSS pixels. `count` items. */
	xs: Float64Array;
	/** y of each value, CSS pixels. `count * stride` items, in the order of `values`. */
	ys: Float64Array;
	/** The values of the series. The first bar to draw starts at `firstRow * stride`. */
	values: Float64Array;
	firstRow: number;
	/** Distance between two bars, CSS pixels. */
	barSpacing: number;
	/** Device pixels for each CSS pixel. */
	pixelRatio: number;
}

/**
 * A series type. It is a record of plain functions, not a class: the chart core
 * owns ingest, scales, the crosshair and labels, and calls these functions.
 */
export interface SeriesKind<T extends SeriesType = SeriesType> {
	readonly type: T;
	/** Number of values for each bar: 1 (value) or 4 (open, high, low, close). */
	readonly stride: 1 | 4;
	/** Default values of the style options of this kind. */
	readonly defaults: object;
	/** True if the drawing needs one more bar on each side of the visible range (lines). */
	readonly extendRange: boolean;
	/** Draws the bars. The origin of the context is the top left corner of the pane, in device pixels. */
	draw(ctx: CanvasRenderingContext2D, data: SeriesDrawData, options: SeriesOptionsMap[T]): void;
	/** Writes the minimum and maximum price of rows `[fromRow, toRow)` to `out[0]` and `out[1]`. */
	range(values: Float64Array, fromRow: number, toRow: number, out: Float64Array): void;
	/** Color of a bar, for the price label and the crosshair marker. */
	barColor(values: Float64Array, row: number, options: SeriesOptionsMap[T]): string;
	/** Changes user options before they are merged, for options that set other options. */
	normalizeOptions?(options: SeriesPartialOptionsMap[T]): void;
}

/** What `chart.addSeries()` takes: a series kind with the options of the user. */
export interface SeriesSpec<T extends SeriesType = SeriesType> {
	readonly kind: SeriesKind<T>;
	readonly options: SeriesPartialOptionsMap[T];
}
