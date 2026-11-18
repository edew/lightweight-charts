import type { IPriceFormatter } from '../formatters/iformatter';
import { PercentageFormatter } from '../formatters/percentage-formatter';
import { PriceFormatter } from '../formatters/price-formatter';
import { VolumeFormatter } from '../formatters/volume-formatter';

import { ensureNotNull } from '../helpers/assertions';
import { isInteger, merge } from '../helpers/strict-type-checks';

import type { BarPrice, BarPrices } from './bar';
import type { ChartModel } from './chart-model';
import { SearchMode, type SeriesStore } from './data-store';
import type { Pane } from './pane';
import { PriceRange } from './price-range';
import type { PriceScale } from './price-scale/price-scale';
import type { SeriesKind } from './series-kind';
import type { LineStyleOptions, SeriesOptionsMap, SeriesPartialOptionsMap, SeriesType } from './series-options';
import type { TimePointIndex } from './time-scale/time-data';

export interface FirstValue {
	value: number;
	timeIndex: number;
}

/** The last visible bar of a series, for the label on the price axis. */
export interface LastValue {
	price: number;
	/** y of the price, CSS pixels. */
	coordinate: number;
	color: string;
	/** The price in the format of the price scale mode. */
	text: string;
	formattedPriceAbsolute: string;
	formattedPricePercentage: string;
}

export interface SeriesDataAtTypeMap {
	Candlestick: BarPrices;
	Line: BarPrice;
}

const rangeOut = new Float64Array(2);

export class Series<T extends SeriesType = SeriesType> {
	public readonly kind: SeriesKind<T>;
	readonly #model: ChartModel;
	readonly #options: SeriesOptionsMap[T];
	readonly #store: SeriesStore;
	#formatter!: IPriceFormatter;
	#priceScale: PriceScale | null = null;
	#pane: Pane | null = null;

	public constructor(model: ChartModel, kind: SeriesKind<T>, options: SeriesOptionsMap[T]) {
		this.#model = model;
		this.kind = kind;
		this.#options = options;
		this.#store = model.dataStore().createSeries(kind.stride);
		this.#recreateFormatter();
	}

	/** Removes the data of the series from the data store. */
	public destroy(): void {
		this.#model.dataStore().removeSeries(this.#store);
	}

	public model(): ChartModel {
		return this.#model;
	}

	public store(): SeriesStore {
		return this.#store;
	}

	public seriesType(): T {
		return this.kind.type;
	}

	public options(): Readonly<SeriesOptionsMap[T]> {
		return this.#options;
	}

	public applyOptions(options: SeriesPartialOptionsMap[T]): void {
		const overlay = this.#options.overlay;
		merge(this.#options, options);
		this.#options.overlay = overlay;

		if (overlay && this.#priceScale !== null && options.scaleMargins !== undefined) {
			this.#priceScale.applyOptions({
				scaleMargins: this.#options.scaleMargins,
			});
		}

		if (options.priceFormat !== undefined) {
			this.#recreateFormatter();
		}

		this.#model.lightUpdate();
	}

	public priceScale(): PriceScale {
		return ensureNotNull(this.#priceScale);
	}

	public setPriceScale(priceScale: PriceScale): void {
		this.#priceScale = priceScale;
	}

	public pane(): Pane {
		return ensureNotNull(this.#pane);
	}

	public setPane(pane: Pane): void {
		this.#pane = pane;
	}

	public minMove(): number {
		return this.#options.priceFormat.minMove;
	}

	public formatter(): IPriceFormatter {
		return this.#formatter;
	}

	public title(): string {
		return this.#options.title;
	}

	public barColor(row: number): string {
		return this.kind.barColor(this.#store.values, row, this.#options);
	}

	/** The price and time index of the first visible bar. Percentage scales use it as the base. */
	public firstValue(): FirstValue | null {
		const visibleBars = this.#model.timeScale().visibleBars();
		if (visibleBars === null) {
			return null;
		}

		const row = this.#store.rowAt(visibleBars.firstBar(), SearchMode.NearestRight);
		if (row < 0) {
			return null;
		}

		return {
			value: this.#store.closeAt(row),
			timeIndex: this.#store.timeIndexAt(row),
		};
	}

	/** The last visible bar, or null if no bar is visible. */
	public lastValue(): LastValue | null {
		const priceScale = this.priceScale();
		const store = this.#store;
		const timeScale = this.#model.timeScale();

		if (timeScale.isEmpty() || priceScale.isEmpty() || store.length === 0) {
			return null;
		}

		const visibleBars = timeScale.visibleBars();
		const firstValue = this.firstValue();
		if (visibleBars === null || firstValue === null) {
			return null;
		}

		const row = store.rowAt(visibleBars.lastBar(), SearchMode.NearestLeft);
		if (row < 0) {
			return null;
		}

		const price = store.closeAt(row);
		return {
			price,
			coordinate: priceScale.priceToCoordinate(price, firstValue.value),
			color: this.barColor(row),
			text: priceScale.formatPrice(price, firstValue.value),
			formattedPriceAbsolute: priceScale.formatPriceAbsolute(price),
			formattedPricePercentage: priceScale.formatPricePercentage(price, firstValue.value),
		};
	}

	/** The price range of the bars with a time index in `[start, end]`, or null if there is none. */
	public autoscaleRange(start: TimePointIndex, end: TimePointIndex): PriceRange | null {
		const store = this.#store;
		if (!isInteger(start) || !isInteger(end) || store.length === 0) {
			return null;
		}

		const from = store.lowerBound(start);
		const to = store.lowerBound(end + 1);
		if (from >= to) {
			return null;
		}

		// a plain scan of the visible rows
		this.kind.range(store.values, from, to, rangeOut);
		return rangeOut[0] <= rangeOut[1] ? new PriceRange(rangeOut[0], rangeOut[1]) : null;
	}

	public dataAt(time: TimePointIndex): SeriesDataAtTypeMap[SeriesType] | null {
		const row = isInteger(time) ? this.#store.rowAt(time) : -1;
		if (row < 0) {
			return null;
		}

		const values = this.#store.values;
		if (this.#store.stride === 4) {
			const offset = row * 4;
			return {
				open: values[offset] as BarPrice,
				high: values[offset + 1] as BarPrice,
				low: values[offset + 2] as BarPrice,
				close: values[offset + 3] as BarPrice,
			};
		}

		return values[row] as BarPrice;
	}

	/** Radius of the crosshair marker, or 0 if the series has none. */
	public crosshairMarkerRadius(): number {
		const options = this.#options as Partial<LineStyleOptions>;
		return options.crosshairMarkerVisible === true ? options.crosshairMarkerRadius ?? 0 : 0;
	}

	#recreateFormatter(): void {
		const priceFormat = this.#options.priceFormat;
		switch (priceFormat.type) {
			case 'custom': {
				this.#formatter = { format: priceFormat.formatter };
				break;
			}
			case 'volume': {
				this.#formatter = new VolumeFormatter(priceFormat.precision);
				break;
			}
			case 'percent': {
				this.#formatter = new PercentageFormatter(priceFormat.precision);
				break;
			}
			default: {
				const priceScale = Math.pow(10, priceFormat.precision);
				this.#formatter = new PriceFormatter(
					priceScale,
					priceFormat.minMove * priceScale,
					false,
					undefined
				);
			}
		}

		if (this.#priceScale !== null) {
			this.#priceScale.updateFormatter();
		}
	}
}
