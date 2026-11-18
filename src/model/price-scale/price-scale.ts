import { priceFormat, type PriceFormatter } from '../../formatters/price-formatter';

import { type DeepPartial, merge } from '../../helpers/strict-type-checks';

import type { BarPrice } from '../bar';
import type { BarsRange } from '../bars-range';
import type { Coordinate } from '../coordinate';
import type { LayoutOptions } from '../layout-options';
import type { LocalizationOptions } from '../localization-options';
import type { FirstValue, Series } from '../series';

/**
 * Enum of possible price scale modes
 * Normal mode displays original price values
 * Logarithmic mode makes price scale show logarithms of series values instead of original values
 * Percentage turns the percentage mode on.
 * IndexedTo100 turns the "indexed to 100" mode on
 */
export enum PriceScaleMode {
	Normal,
	Logarithmic,
	Percentage,
	IndexedTo100,
}

export interface PriceMark {
	coord: Coordinate;
	label: string;
}

/** A range of prices. An object of this type does not change. */
export interface PriceRange {
	readonly min: number;
	readonly max: number;
}

/** Defines margins of the price scale */
export interface PriceScaleMargins {
	/** Top margin in percentages. Must be greater or equal to 0 and less than 100 */
	top: number;
	/** Bottom margin in percentages. Must be greater or equal to 0 and less than 100 */
	bottom: number;
}

export type PriceAxisPosition = 'left' | 'right' | 'none';

/** Structure that describes price scale options */
export interface PriceScaleOptions {
	/** True makes chart calculate the price range automatically based on the visible data range */
	autoScale: boolean;
	/** Mode of the price scale */
	mode: PriceScaleMode;
	/** True inverts the scale. Makes larger values drawn lower. Affects both the price scale and the data on the chart */
	invertScale: boolean;
	/** True value prevents labels on the price scale from overlapping one another by aligning them one below others */
	alignLabels: boolean;
	/** Defines position of the price scale on the chart */
	position: PriceAxisPosition;
	/** Defines price margins for the price scale */
	scaleMargins: PriceScaleMargins;
	/** Set true to draw a border between the price scale and the chart area */
	borderVisible: boolean;
	/** Defines a color of the border between the price scale and the chart area. It is ignored if borderVisible is false */
	borderColor: string;
	/** Indicates whether the price scale displays only full lines of text or partial lines. */
	entireTextOnly: boolean;
}

// ---- conversions between a price and the value that the scale shows

/**
 * Percentage of the difference from `base`. `offset` is 0 for the percentage mode
 * and 100 for the mode "indexed to 100".
 */
export function toRelative(price: number, base: number, offset: number): number {
	const result = 100 * (price - base) / base + offset;
	return base < 0 ? -result : result;
}

export function fromRelative(value: number, base: number, offset: number): number {
	return ((base < 0 ? -value : value) - offset) / 100 * base + base;
}

export function toLog(price: number): number {
	const m = Math.abs(price);
	if (m < 1e-8) {
		return 0;
	}
	const res = Math.log10(m + 0.0001) + 4;
	return price < 0 ? -res : res;
}

export function fromLog(logical: number): number {
	const m = Math.abs(logical);
	if (m < 1e-8) {
		return 0;
	}
	const res = 10 ** (m - 4) - 0.0001;
	return logical < 0 ? -res : res;
}

// ---- distance between tick marks

const tickSpanEpsilon = 1e-9;
const integralDividers = [[2, 2.5, 2], [2, 2, 2.5], [2.5, 2, 2]];

/**
 * The dividers for a tick span below 1. `base` is the number of minimum moves in one unit of price.
 * A decimal base (10, 100, ...) gives the steps 0.5, 0.2, 0.1; a base such as 4 or 32 gives halves.
 */
export function fractionalDividers(base: number): number[] {
	let rest = base;
	while (rest > 1 && rest % 10 === 0) {
		rest /= 10;
	}
	if (rest <= 1) {
		return integralDividers[0];
	}

	const result: number[] = [];
	for (rest = base; rest > 1;) {
		if (rest % 2 === 0) {
			result.push(2);
			rest /= 2;
		} else if (rest % 5 === 0) {
			result.push(2, 2.5);
			rest /= 5;
		} else {
			break;
		}
	}
	return result;
}

/** The largest "round" step that is not smaller than `maxTickSpan / divider`, for one order of dividers. */
export function tickSpan(high: number, low: number, maxTickSpan: number, base: number, dividers: number[], fractional: number[]): number {
	const minMove = base === 0 ? 0 : 1 / base;
	const limit = minMove + tickSpanEpsilon;

	let span = 10 ** Math.max(0, Math.ceil(Math.log10(high - low)));
	let index = 0;
	let c = dividers[0];
	while (span > limit && maxTickSpan * c - span <= tickSpanEpsilon && 1 - span <= tickSpanEpsilon) {
		span /= c;
		c = dividers[++index % dividers.length];
	}

	span = Math.max(1, span <= limit ? minMove : span);

	if (fractional.length > 0 && Math.abs(span - 1) < tickSpanEpsilon) {
		index = 0;
		c = fractional[0];
		while (maxTickSpan * c - span <= tickSpanEpsilon && span > limit) {
			span /= c;
			c = fractional[++index % fractional.length];
		}
	}

	return span;
}

const percentageFormatter = priceFormat(2, 0.01, '%');
const defaultFormatter = priceFormat(2, 0.01);

function mapRange(range: PriceRange, fn: (value: number) => number): PriceRange {
	return { min: fn(range.min), max: fn(range.max) };
}

export class PriceScale {
	readonly #layoutOptions: LayoutOptions;
	readonly #localizationOptions: LocalizationOptions;
	readonly #options: PriceScaleOptions;

	#height: number = 0;

	/** The visible range, in the values that the scale shows (for example logarithms in the logarithmic mode). */
	#priceRange: PriceRange | null = null;
	/** The bars of the last autoscale request. */
	#autoscaleBars: BarsRange | null = null;
	#autoscaleDone: boolean = true;

	readonly #sources: Series[] = [];

	readonly #marks: PriceMark[] = [];
	#marksValid: boolean = false;
	#tickBase: number = 100;
	#fractionalDividers: number[] = integralDividers[0];
	#formatter: PriceFormatter = defaultFormatter;

	// state of a drag on the axis (scale) or in the pane (scroll)
	#scaleStart: number | null = null;
	#scrollStart: number | null = null;
	#rangeAtStart: PriceRange | null = null;

	public constructor(options: PriceScaleOptions, layoutOptions: LayoutOptions, localizationOptions: LocalizationOptions) {
		this.#options = options;
		this.#layoutOptions = layoutOptions;
		this.#localizationOptions = localizationOptions;
	}

	public options(): Readonly<PriceScaleOptions> {
		return this.#options;
	}

	public applyOptions(options: DeepPartial<PriceScaleOptions>): void {
		const current = this.#options;
		const oldMode = current.mode;
		merge(current, options);

		const { top, bottom } = current.scaleMargins;
		if (top < 0 || bottom < 0 || top + bottom > 1) {
			throw new Error('Invalid scale margins');
		}

		const mode = current.mode;
		if (mode !== oldMode) {
			if (this.#isRelative()) {
				current.autoScale = true;
			}
			this.#autoscaleDone = !current.autoScale;

			// keep the range of a scale with no autoscale: convert it to the values of the new mode
			let range = this.#priceRange;
			if (range !== null) {
				if (oldMode === PriceScaleMode.Logarithmic) {
					range = mapRange(range, fromLog);
				}
				if (mode === PriceScaleMode.Logarithmic) {
					range = mapRange(range, toLog);
				}
				if (isFinite(range.min) && isFinite(range.max)) {
					this.#priceRange = range;
				} else {
					current.autoScale = true;
				}
			}
		}

		this.updateFormatter();
	}

	public isAutoScale(): boolean {
		return this.#options.autoScale;
	}

	public setAutoScale(autoScale: boolean): void {
		this.#options.autoScale = autoScale;
	}

	public isPercentage(): boolean {
		return this.#options.mode === PriceScaleMode.Percentage;
	}

	public isIndexedTo100(): boolean {
		return this.#options.mode === PriceScaleMode.IndexedTo100;
	}

	public height(): number {
		return this.#height;
	}

	public setHeight(value: number): void {
		this.#height = value;
		this.#marksValid = false;
	}

	public priceRange(): PriceRange | null {
		this.#autoscale();
		return this.#priceRange;
	}

	public setPriceRange(range: PriceRange | null): void {
		const old = this.#priceRange;
		if (old === range || old !== null && range !== null && old.min === range.min && old.max === range.max) {
			return;
		}

		this.#priceRange = range;
		this.#marksValid = false;
	}

	public isEmpty(): boolean {
		const range = this.priceRange();
		// the difference is 0 for a range of one value, and NaN for a range with NaN
		return this.#height === 0 || range === null || !(range.max - range.min);
	}

	public priceToCoordinate(price: number, baseValue: number): Coordinate {
		return this.#toCoordinate(this.#toScale(price, baseValue));
	}

	/**
	 * Converts prices to y coordinates (CSS pixels) in one pass.
	 * Reads `values[from..to)` and writes `out[0..to - from)`.
	 */
	public pricesToCoordinates(values: Float64Array, from: number, to: number, out: Float64Array, baseValue: number): void {
		if (this.isEmpty()) {
			out.fill(0, 0, to - from);
			return;
		}

		const range = this.#priceRange as PriceRange;
		const min = range.min;
		const bottom = this.#bottomMargin();
		const factor = (this.#internalHeight() - 1) / (range.max - min);
		const inverted = this.#options.invertScale;
		const last = this.#height - 1;
		const mode = this.#options.mode;
		const offset = mode === PriceScaleMode.Percentage ? 0 : 100;

		for (let i = from; i < to; i++) {
			let value = values[i];
			if (mode === PriceScaleMode.Logarithmic) {
				value = toLog(value);
			} else if (mode !== PriceScaleMode.Normal) {
				value = toRelative(value, baseValue, offset);
			}
			const y = bottom + factor * (value - min);
			out[i - from] = inverted ? y : last - y;
		}
	}

	public coordinateToPrice(coordinate: Coordinate, baseValue: number): BarPrice {
		const value = this.#fromCoordinate(coordinate);
		const mode = this.#options.mode;
		if (mode === PriceScaleMode.Logarithmic) {
			return fromLog(value) as BarPrice;
		}
		return (this.#isRelative() ? fromRelative(value, baseValue, this.#relativeOffset()) : value) as BarPrice;
	}

	public sources(): ReadonlyArray<Series> {
		return this.#sources;
	}

	public addSource(source: Series): void {
		this.#sources.push(source);
		this.updateFormatter();
	}

	public removeSource(source: Series): void {
		const index = this.#sources.indexOf(source);
		if (index !== -1) {
			this.#sources.splice(index, 1);
		}
		if (this.#sources.length === 0) {
			this.#options.autoScale = true;
		}
		this.updateFormatter();
	}

	/** The base value for the percentage modes: the first visible value of the series that starts first. */
	public firstValue(): number | null {
		let result: FirstValue | null = null;

		for (const source of this.#sources) {
			const firstValue = source.firstValue();
			if (firstValue !== null && (result === null || firstValue.timeIndex < result.timeIndex)) {
				result = firstValue;
			}
		}

		return result === null ? null : result.value;
	}

	/** The tick marks of the axis. The array and its items are used again for each build. */
	public marks(): PriceMark[] {
		this.#autoscale();
		if (!this.#marksValid) {
			this.#marksValid = true;
			this.#buildMarks();
		}
		return this.#marks;
	}

	// ---- drag on the price axis (scale) and in the pane (scroll)

	public startScale(y: number): void {
		if (!this.#isRelative() && this.#rangeAtStart === null && !this.isEmpty()) {
			this.#scaleStart = this.#height - y;
			this.#rangeAtStart = this.#priceRange;
		}
	}

	public scaleTo(y: number): void {
		const start = this.#scaleStart;
		const range = this.#rangeAtStart;
		if (start === null || range === null) {
			return;
		}

		this.#options.autoScale = false;

		const margin = (this.#height - 1) * 0.2;
		const coeff = Math.max((start + margin) / (Math.max(0, this.#height - y) + margin), 0.1);
		const center = (range.max + range.min) / 2;
		const half = (range.max - range.min) / 2 * coeff;
		this.setPriceRange({ min: center - half, max: center + half });
	}

	public startScroll(y: number): void {
		if (!this.#options.autoScale && this.#rangeAtStart === null && !this.isEmpty()) {
			this.#scrollStart = y;
			this.#rangeAtStart = this.#priceRange;
		}
	}

	public scrollTo(y: number): void {
		const start = this.#scrollStart;
		const range = this.#rangeAtStart;
		if (start === null || range === null || this.#options.autoScale) {
			return;
		}

		let delta = (y - start) * (range.max - range.min) / (this.#internalHeight() - 1);
		if (this.#options.invertScale) {
			delta = -delta;
		}
		this.setPriceRange({ min: range.min + delta, max: range.max + delta });
	}

	/** Ends a scale or a scroll. */
	public endDrag(): void {
		this.#scaleStart = null;
		this.#scrollStart = null;
		this.#rangeAtStart = null;
	}

	// ---- text

	/** The formatter of the series that gives the price format to the scale. */
	public formatter(): PriceFormatter {
		return this.#formatter;
	}

	/** The text of a price in the mode of the scale (for example a percentage). */
	public formatPrice(price: number, baseValue: number): string {
		return this.#isRelative()
			? this.#formatter(toRelative(price, baseValue, this.#relativeOffset()))
			: this.formatPriceAbsolute(price);
	}

	public formatPriceAbsolute(price: number): string {
		const sources = this.#sources;
		return (this.#localizationOptions.priceFormatter ?? (sources.length !== 0 ? sources[0].formatter() : defaultFormatter))(price as BarPrice);
	}

	public formatPricePercentage(price: number, baseValue: number): string {
		return percentageFormatter(toRelative(price, baseValue, 0));
	}

	/** Sets the bars for the next calculation of the price range. */
	public recalculatePriceRange(visibleBars: BarsRange): void {
		this.#autoscaleBars = visibleBars;
		this.#autoscaleDone = false;
	}

	/** Call when the price format of the first series, the mode or the localization changed. */
	public updateFormatter(): void {
		this.#marksValid = false;

		const relative = this.#isRelative();
		const mainSource = this.#sources.length !== 0 ? this.#sources[0] : null;
		this.#formatter = this.isPercentage() ? percentageFormatter : relative || mainSource === null ? defaultFormatter : mainSource.formatter();
		this.#tickBase = relative || mainSource === null ? 100 : Math.round(1 / mainSource.minMove());
		this.#fractionalDividers = fractionalDividers(this.#tickBase);
	}

	// ---- private

	#isRelative(): boolean {
		return this.#options.mode >= PriceScaleMode.Percentage;
	}

	#relativeOffset(): number {
		return this.isPercentage() ? 0 : 100;
	}

	#toScale(price: number, baseValue: number): number {
		if (this.#options.mode === PriceScaleMode.Logarithmic) {
			return toLog(price);
		}
		return this.#isRelative() ? toRelative(price, baseValue, this.#relativeOffset()) : price;
	}

	#bottomMargin(): number {
		const margins = this.#options.scaleMargins;
		return (this.#options.invertScale ? margins.top : margins.bottom) * this.#height;
	}

	#internalHeight(): number {
		const margins = this.#options.scaleMargins;
		const height = this.#height;
		return this.#options.invertScale
			? height - margins.bottom * height - margins.top * height
			: height - margins.top * height - margins.bottom * height;
	}

	#invert(coordinate: number): number {
		return this.#options.invertScale ? coordinate : this.#height - 1 - coordinate;
	}

	/** y of a value of the scale. */
	#toCoordinate(value: number): Coordinate {
		if (this.isEmpty()) {
			return 0 as Coordinate;
		}

		const range = this.#priceRange as PriceRange;
		return this.#invert(
			this.#bottomMargin() + (this.#internalHeight() - 1) * (value - range.min) / (range.max - range.min)
		) as Coordinate;
	}

	/** Value of the scale at y. */
	#fromCoordinate(coordinate: number): number {
		if (this.isEmpty()) {
			return 0;
		}

		const range = this.#priceRange as PriceRange;
		return range.min + (range.max - range.min) * (this.#invert(coordinate) - this.#bottomMargin()) / (this.#internalHeight() - 1);
	}

	/** Calculates the price range from the visible bars of the sources, if a calculation was requested. */
	#autoscale(): void {
		const visibleBars = this.#autoscaleBars;
		if (visibleBars === null || this.#autoscaleDone) {
			return;
		}
		this.#autoscaleDone = true;

		let min = Infinity;
		let max = -Infinity;

		for (const source of this.#sources) {
			const firstValue = source.firstValue();
			const range = firstValue === null ? null : source.autoscaleRange(visibleBars.first, visibleBars.last);
			if (firstValue !== null && range !== null) {
				min = Math.min(min, this.#toScale(range.min, firstValue.value));
				max = Math.max(max, this.#toScale(range.max, firstValue.value));
			}
		}

		if (min <= max) {
			if (min === max) {
				// a range of one value: extend it by 5 minimum moves in each direction,
				// so that the scale is not empty
				const extend = 5 * (this.#isRelative() || this.#sources.length === 0 ? 1 : this.#sources[0].minMove());
				min -= extend;
				max += extend;
			}
			this.setPriceRange({ min, max });
		} else if (this.#priceRange === null) {
			this.setPriceRange({ min: -0.5, max: 0.5 });
		}
	}

	#buildMarks(): void {
		const marks = this.#marks;
		const height = this.#height;
		const isLog = this.#options.mode === PriceScaleMode.Logarithmic;
		let count = 0;

		// a tick mark is at a "round" value: a price, or a percentage in the percentage modes
		const bottom = this.#fromCoordinate(height - 1);
		const top = this.#fromCoordinate(0);
		const high = isLog ? fromLog(Math.max(bottom, top)) : Math.max(bottom, top);
		const low = isLog ? fromLog(Math.min(bottom, top)) : Math.min(bottom, top);

		if (high !== low && this.firstValue() !== null) {
			const fontSize = this.#layoutOptions.fontSize;
			const markHeight = Math.ceil(fontSize * 2.5);
			// with `entireTextOnly`, a label that is not fully visible is not shown
			const margin = this.#options.entireTextOnly ? fontSize / 2 : 0;

			let span = this.#tickSpan(high, low, markHeight);
			let mod = high % span;
			mod += mod < 0 ? span : 0;

			let prevCoord = NaN;
			for (let value = high - mod; value > low; value -= span) {
				const coord = this.#toCoordinate(isLog ? toLog(value) : value);

				// in the logarithmic mode, the distance between marks is not constant
				if (Math.abs(coord - prevCoord) < markHeight || coord < margin || coord > height - 1 - margin) {
					continue;
				}

				const label = this.#isRelative() ? this.#formatter(value) : this.formatPriceAbsolute(value);
				if (count < marks.length) {
					marks[count].coord = coord;
					marks[count].label = label;
				} else {
					marks.push({ coord, label });
				}
				count++;
				prevCoord = coord;

				if (isLog) {
					span = this.#tickSpan(value, low, markHeight);
				}
			}
		}

		marks.length = count;
	}

	#tickSpan(high: number, low: number, markHeight: number): number {
		const maxTickSpan = (high - low) * markHeight / this.#height;
		const base = this.#tickBase;
		const fractional = this.#fractionalDividers;
		return Math.min(
			tickSpan(high, low, maxTickSpan, base, integralDividers[0], fractional),
			tickSpan(high, low, maxTickSpan, base, integralDividers[1], fractional),
			tickSpan(high, low, maxTickSpan, base, integralDividers[2], fractional)
		);
	}
}
