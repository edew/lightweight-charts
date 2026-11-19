import { priceFormat, type PriceFormatter, volumeFormat } from '../formatters/price-formatter';

import { merge } from '../helpers/strict-type-checks';

import type { BarPrice, BarPrices } from './bar';
import type { ChartModel } from './chart-model';
import { SearchMode, type SeriesStore } from './data-store';
import type { Pane } from './pane';
import type { PriceRange, PriceScale } from './price-scale/price-scale';
import type { SeriesKind } from './series-kind';
import type { LineStyleOptions, PriceFormat, SeriesOptionsMap, SeriesPartialOptionsMap, SeriesType } from './series-options';
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

function makeFormatter(format: PriceFormat): PriceFormatter {
	return format.type === 'custom'
		? format.formatter as PriceFormatter
		: format.type === 'volume'
			? volumeFormat(format.precision)
			: priceFormat(format.precision, format.minMove, format.type === 'percent' ? '%' : '');
}

export class Series<T extends SeriesType = SeriesType> {
	public readonly kind: SeriesKind<T>;
	readonly #model: ChartModel;
	readonly #options: SeriesOptionsMap[T];
	readonly #store: SeriesStore;
	readonly #priceScale: PriceScale;
	readonly #pane: Pane;
	#formatter: PriceFormatter;

	/** `Pane.createSeries()` is the only caller: it makes the price scale and adds the series to it. */
	public constructor(model: ChartModel, pane: Pane, priceScale: PriceScale, kind: SeriesKind<T>, options: SeriesOptionsMap[T]) {
		this.#model = model;
		this.#pane = pane;
		this.#priceScale = priceScale;
		this.kind = kind;
		this.#options = options;
		this.#store = model.dataStore().createSeries(kind.stride);
		this.#formatter = makeFormatter(options.priceFormat);
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

	public options(): Readonly<SeriesOptionsMap[T]> {
		return this.#options;
	}

	public applyOptions(options: SeriesPartialOptionsMap[T]): void {
		const overlay = this.#options.overlay;
		merge(this.#options, options);
		this.#options.overlay = overlay;

		if (overlay && options.scaleMargins !== undefined) {
			this.#priceScale.applyOptions({
				scaleMargins: this.#options.scaleMargins,
			});
		}

		if (options.priceFormat !== undefined) {
			this.#formatter = makeFormatter(this.#options.priceFormat);
			this.#priceScale.updateFormatter();
		}

		this.#model.lightUpdate();
	}

	public priceScale(): PriceScale {
		return this.#priceScale;
	}

	public pane(): Pane {
		return this.#pane;
	}

	public minMove(): number {
		return this.#options.priceFormat.minMove;
	}

	public formatter(): PriceFormatter {
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

		const row = this.#store.rowAt(visibleBars.first, SearchMode.NearestRight);
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

		const row = store.rowAt(visibleBars.last, SearchMode.NearestLeft);
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
		if (store.length === 0) {
			return null;
		}

		const from = store.lowerBound(start);
		const to = store.lowerBound(end + 1);
		if (from >= to) {
			return null;
		}

		// a plain scan of the visible rows
		this.kind.range(store.values, from, to, rangeOut);
		return rangeOut[0] <= rangeOut[1] ? { min: rangeOut[0], max: rangeOut[1] } : null;
	}

	public dataAt(time: TimePointIndex): SeriesDataAtTypeMap[SeriesType] | null {
		const row = Number.isInteger(time) ? this.#store.rowAt(time) : -1;
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
}
