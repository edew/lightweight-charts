
import type { IPriceFormatter } from '../formatters/iformatter';
import { PercentageFormatter } from '../formatters/percentage-formatter';
import { PriceFormatter } from '../formatters/price-formatter';
import { VolumeFormatter } from '../formatters/volume-formatter';

import { ensureNotNull } from '../helpers/assertions';
import type { IDestroyable } from '../helpers/idestroyable';
import { isInteger, merge } from '../helpers/strict-type-checks';

import { SeriesCandlesticksPaneView } from '../views/pane/candlesticks-pane-view';
import type { IPaneView } from '../views/pane/ipane-view';
import type { IUpdatablePaneView } from '../views/pane/iupdatable-pane-view';
import { SeriesLinePaneView } from '../views/pane/line-pane-view';
import { PanePriceAxisView } from '../views/pane/pane-price-axis-view';
import { SeriesHorizontalBaseLinePaneView } from '../views/pane/series-horizontal-base-line-pane-view';
import type { IPriceAxisView } from '../views/price-axis/iprice-axis-view';
import { SeriesPriceAxisView } from '../views/price-axis/series-price-axis-view';

import type { AutoscaleInfo } from './data-source/autoscale-info';
import type { BarPrice, BarPrices } from './bar';
import { ChartModel } from './chart-model';
import type { Coordinate } from './coordinate';
import type { FirstValue } from './data-source/iprice-data-source';
import { Pane } from './pane';
import { SearchMode, type SeriesStore } from './data-store';
import { PriceDataSource } from './data-source/price-data-source';
import { PriceRange } from './price-range';
import { PriceScale } from './price-scale/price-scale';
import { SeriesBarColorer } from './series-bar-colorer';
import type {
	LineStyleOptions,
	SeriesOptionsMap,
	SeriesPartialOptionsMap,
	SeriesType,
} from './series-options';
import type { TimePointIndex } from './time-scale/time-data';

export interface LastValueDataResult {
	noData: boolean;
}

export interface LastValueDataResultWithoutData extends LastValueDataResult {
	noData: true;
}

export interface LastValueDataResultWithData extends LastValueDataResult {
	noData: false;
	text: string;
	formattedPriceAbsolute: string;
	formattedPricePercentage: string;
	color: string;
	coordinate: Coordinate;
	index: TimePointIndex;
}

export interface LastValueDataResultWithRawPrice extends LastValueDataResultWithData {
	price: number;
}

export type LastValueDataResultWithoutRawPrice = LastValueDataResultWithoutData | LastValueDataResultWithData;

export interface MarkerData {
	price: BarPrice;
	radius: number;
}

export interface SeriesDataAtTypeMap {
	Candlestick: BarPrices;
	Line: BarPrice;
}

export class Series<T extends SeriesType = SeriesType> extends PriceDataSource implements IDestroyable {
	readonly #seriesType: T;
	readonly #store: SeriesStore;
	readonly #priceAxisViews: IPriceAxisView[];
	readonly #panePriceAxisView: PanePriceAxisView;
	#formatter!: IPriceFormatter;
	readonly #baseHorizontalLineView: SeriesHorizontalBaseLinePaneView = new SeriesHorizontalBaseLinePaneView(this);
	#paneView!: IUpdatablePaneView;
	#barColorerCache: SeriesBarColorer | null = null;
	readonly #options: SeriesOptionsMap[T];

	public constructor(model: ChartModel, options: SeriesOptionsMap[T], seriesType: T) {
		super(model);
		this.#options = options;
		this.#seriesType = seriesType;
		this.#store = model.dataStore().createSeries(seriesType === 'Line' ? 1 : 4);

		const priceAxisView = new SeriesPriceAxisView(this, { model: model });
		this.#priceAxisViews = [priceAxisView];

		this.#panePriceAxisView = new PanePriceAxisView(priceAxisView, this, model);

		this.#recreateFormatter();
		this.#recreatePaneViews();
	}

	public destroy(): void {
		this.model().dataStore().removeSeries(this.#store);
	}

	public priceLineColor(lastBarColor: string): string {
		return lastBarColor;
	}

	// returns the formatted price, coordinate and color of the last visible bar,
	// or { noData: true } if there is none
	public lastValueData(): LastValueDataResultWithoutRawPrice {
		const noDataRes: LastValueDataResultWithoutData = { noData: true };

		const priceScale = this.priceScale();
		const store = this.#store;

		if (this.model().timeScale().isEmpty() || priceScale.isEmpty() || store.length === 0) {
			return noDataRes;
		}

		const visibleBars = this.model().timeScale().visibleBars();
		const firstValue = this.firstValue();
		if (visibleBars === null || firstValue === null) {
			return noDataRes;
		}

		const row = store.rowAt(visibleBars.lastBar(), SearchMode.NearestLeft);
		if (row < 0) {
			return noDataRes;
		}

		const price = store.closeAt(row);
		const style = this.barColorer().barStyle(row);
		const coordinate = priceScale.priceToCoordinate(price, firstValue.value);

		return {
			noData: false,
			text: priceScale.formatPrice(price, firstValue.value),
			formattedPriceAbsolute: priceScale.formatPriceAbsolute(price),
			formattedPricePercentage: priceScale.formatPricePercentage(price, firstValue.value),
			color: style.barColor,
			coordinate: coordinate,
			index: store.timeIndexAt(row) as TimePointIndex,
		};
	}

	public store(): SeriesStore {
		return this.#store;
	}

	public barColorer(): SeriesBarColorer {
		if (this.#barColorerCache !== null) {
			return this.#barColorerCache;
		}

		this.#barColorerCache = new SeriesBarColorer(this);
		return this.#barColorerCache;
	}

	public options(): Readonly<SeriesOptionsMap[T]> {
		return this.#options;
	}

	public applyOptions(options: SeriesPartialOptionsMap[T]): void {
		const overlay = this.#options.overlay;
		merge(this.#options, options);
		this.#options.overlay = overlay;

		if (overlay && this._priceScale !== null && options.scaleMargins !== undefined) {
			this._priceScale.applyOptions({
				scaleMargins: this.#options.scaleMargins,
			});
		}

		if (options.priceFormat !== undefined) {
			this.#recreateFormatter();
		}

		this.model().updateSource(this);
	}

	/** Call after the values or the time indexes of the store changed. */
	public onDataChanged(): void {
		this.#paneView.update('data');

		const sourcePane = this.model().paneForSource(this);
		this.model().recalculatePane(sourcePane);
		this.model().updateSource(this);
		this.model().updateCrosshair();
		this.model().lightUpdate();
	}

	public seriesType(): T {
		return this.#seriesType;
	}

	/** The price and time index of the first visible bar. Percentage scales use it as the base. */
	public firstValue(): FirstValue | null {
		const visibleBars = this.model().timeScale().visibleBars();
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

	public dataAt(time: TimePointIndex): SeriesDataAtTypeMap[SeriesType] | null {
		const row = isInteger(time) ? this.#store.rowAt(time) : -1;
		if (row < 0) {
			return null;
		}

		const values = this.#store.values;
		if (this.#seriesType === 'Candlestick') {
			const offset = row * 4;
			return {
				open: values[offset] as BarPrice,
				high: values[offset + 1] as BarPrice,
				low: values[offset + 2] as BarPrice,
				close: values[offset + 3] as BarPrice,
			};
		} else {
			return values[row] as BarPrice;
		}
	}

	public paneViews(): ReadonlyArray<IPaneView> {
		const res: IPaneView[] = [];

		if (this.priceScale() === this.model().mainPriceScale()) {
			res.push(this.#baseHorizontalLineView);
		}

		res.push(this.#paneView);

		res.push(this.#panePriceAxisView);

		return res;
	}

	public priceAxisViews(pane: Pane, priceScale: PriceScale): ReadonlyArray<IPriceAxisView> {
		const result = [...this.#priceAxisViews];

		return result;
	}

	public autoscaleInfo(startTimePoint: TimePointIndex, endTimePoint: TimePointIndex): AutoscaleInfo | null {
		const store = this.#store;
		if (!isInteger(startTimePoint) || !isInteger(endTimePoint) || store.length === 0) {
			return null;
		}

		// a plain scan of the visible rows: for a Line the value, for candles low and high
		const values = store.values;
		const stride = store.stride;
		const lowColumn = stride === 4 ? 2 : 0;
		const highColumn = stride === 4 ? 1 : 0;
		const from = store.lowerBound(startTimePoint);
		const to = store.lowerBound(endTimePoint + 1);

		let min = Infinity;
		let max = -Infinity;
		for (let row = from; row < to; row++) {
			const low = values[row * stride + lowColumn];
			const high = values[row * stride + highColumn];
			if (low < min) {
				min = low;
			}
			if (high > max) {
				max = high;
			}
		}

		return {
			priceRange: min <= max ? new PriceRange(min, max) : null,
			margins: null,
		};
	}

	public minMove(): number {
		return this.#options.priceFormat.minMove;
	}

	public formatter(): IPriceFormatter {
		return this.#formatter;
	}

	public updateAllViews(): void {
		this.#paneView.update();

		for (const priceAxisView of this.#priceAxisViews) {
			priceAxisView.update();
		}

		this.#baseHorizontalLineView.update();
	}

	public setPriceScale(priceScale: PriceScale): void {
		if (this._priceScale === priceScale) {
			return;
		}

		this._priceScale = priceScale;
	}

	public priceScale(): PriceScale {
		return ensureNotNull(this._priceScale);
	}

	public markerDataAtIndex(index: TimePointIndex): MarkerData | null {
		const getValue = (this.#seriesType === 'Line') &&
			(this.#options as LineStyleOptions).crosshairMarkerVisible;

		if (!getValue) {
			return null;
		}
		const row = isInteger(index) ? this.#store.rowAt(index) : -1;
		if (row < 0) {
			return null;
		}
		const price = this.#store.closeAt(row) as BarPrice;
		const radius = this.#markerRadius();
		return { price, radius };
	}

	public title(): string {
		return this.#options.title;
	}

	#markerRadius(): number {
		switch (this.#seriesType) {
			case 'Line':
				return (this.#options as LineStyleOptions).crosshairMarkerRadius;
		}

		return 0;
	}

	#recreateFormatter(): void {
		switch (this.#options.priceFormat.type) {
			case 'custom': {
				this.#formatter = { format: this.#options.priceFormat.formatter };
				break;
			}
			case 'volume': {
				this.#formatter = new VolumeFormatter(this.#options.priceFormat.precision);
				break;
			}
			case 'percent': {
				this.#formatter = new PercentageFormatter(this.#options.priceFormat.precision);
				break;
			}
			default: {
				const priceScale = Math.pow(10, this.#options.priceFormat.precision);
				this.#formatter = new PriceFormatter(
					priceScale,
					this.#options.priceFormat.minMove * priceScale,
					false,
					undefined
				);
			}
		}

		if (this._priceScale !== null) {
			this._priceScale.updateFormatter();
		}
	}

	#recreatePaneViews(): void {
		switch (this.#seriesType) {
			case 'Candlestick': {
				this.#paneView = new SeriesCandlesticksPaneView(this as Series<'Candlestick'>, this.model());
				break;
			}

			case 'Line': {
				this.#paneView = new SeriesLinePaneView(this as Series<'Line'>, this.model());
				break;
			}

			default: throw Error('Unknown chart style assigned: ' + this.#seriesType);
		}
	}
}
