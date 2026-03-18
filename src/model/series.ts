
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
import { Palette } from './palette';
import { Pane } from './pane';
import type { PlotRow } from './plot-data';
import { type MinMax, PlotList, PlotRowSearchMode } from './plot-list';
import { PriceDataSource } from './data-source/price-data-source';
import { PriceRange } from './price-range';
import { PriceScale } from './price-scale/price-scale';
import { SeriesBarColorer } from './series-bar-colorer';
import { type Bar, barFunction, SeriesData, SeriesPlotIndex } from './series-data';
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

export type BarFunction = (bar: Bar['value']) => BarPrice;

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
	#data: SeriesData = new SeriesData();
	readonly #priceAxisViews: IPriceAxisView[];
	readonly #panePriceAxisView: PanePriceAxisView;
	#formatter!: IPriceFormatter;
	readonly #baseHorizontalLineView: SeriesHorizontalBaseLinePaneView = new SeriesHorizontalBaseLinePaneView(this);
	#paneView!: IUpdatablePaneView;
	#barColorerCache: SeriesBarColorer | null = null;
	readonly #options: SeriesOptionsMap[T];
	#barFunction: BarFunction;
	readonly #palette: Palette = new Palette();

	public constructor(model: ChartModel, options: SeriesOptionsMap[T], seriesType: T) {
		super(model);
		this.#options = options;
		this.#seriesType = seriesType;

		const priceAxisView = new SeriesPriceAxisView(this, { model: model });
		this.#priceAxisViews = [priceAxisView];

		this.#panePriceAxisView = new PanePriceAxisView(priceAxisView, this, model);

		this.#recreateFormatter();
		this.#updateBarFunction();
		this.#barFunction = this.barFunction(); // redundant

		this.#recreatePaneViews();
	}

	public destroy(): void {
	}

	public priceLineColor(lastBarColor: string): string {
		return lastBarColor;
	}

	public lastValueData(plot: SeriesPlotIndex | undefined, globalLast: boolean, withRawPrice?: false): LastValueDataResultWithoutRawPrice;
	public lastValueData(plot: SeriesPlotIndex | undefined, globalLast: boolean, withRawPrice: true): LastValueDataResultWithRawPrice;

	// returns object with:
	// formatted price
	// raw price (if withRawPrice)
	// coordinate
	// color
	// or { "noData":true } if last value could not be found
	// NOTE: should NEVER return null or undefined!
	public lastValueData(
		plot: SeriesPlotIndex | undefined,
		globalLast: boolean,
		withRawPrice?: boolean
	): LastValueDataResultWithoutRawPrice | LastValueDataResultWithRawPrice {
		const noDataRes: LastValueDataResultWithoutData = { noData: true };

		const priceScale = this.priceScale();

		if (this.model().timeScale().isEmpty() || priceScale.isEmpty() || this.data().isEmpty()) {
			return noDataRes;
		}

		const visibleBars = this.model().timeScale().visibleBars();
		const firstValue = this.firstValue();
		if (visibleBars === null || firstValue === null) {
			return noDataRes;
		}

		// find range of bars inside range
		// TODO: make it more optimal
		let bar: Bar | null;
		let lastIndex: TimePointIndex;
		if (globalLast) {
			const lastBar = this.data().bars().last();
			if (lastBar === null) {
				return noDataRes;
			}

			bar = lastBar;
			lastIndex = lastBar.index;
		} else {
			const endBar = this.data().bars().search(visibleBars.lastBar(), PlotRowSearchMode.NearestLeft);
			if (endBar === null) {
				return noDataRes;
			}

			bar = this.data().bars().valueAt(endBar.index);
			if (bar === null) {
				return noDataRes;
			}
			lastIndex = endBar.index;
		}

		const price = plot !== undefined ? bar.value[plot] as number : this.#barFunction(bar.value);
		const barColorer = this.barColorer();
		const style = barColorer.barStyle(lastIndex, { value: bar });
		const coordinate = priceScale.priceToCoordinate(price, firstValue.value);

		return {
			noData: false,
			price: withRawPrice ? price : undefined,
			text: priceScale.formatPrice(price, firstValue.value),
			formattedPriceAbsolute: priceScale.formatPriceAbsolute(price),
			formattedPricePercentage: priceScale.formatPricePercentage(price, firstValue.value),
			color: style.barColor,
			coordinate: coordinate,
			index: lastIndex,
		};
	}

	public data(): SeriesData {
		return this.#data;
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

	public clearData(): void {
		this.#data.clear();
		this.#palette.clear();

		// we must either re-create pane view on clear data
		// or clear all caches inside pane views
		// but currently we can't separate update/append last bar and full data replacement (update vs setData) in pane views invalidation
		// so let's just re-create all views
		this.#recreatePaneViews();
	}

	public updateData(data: ReadonlyArray<PlotRow<Bar['time'], Bar['value']>>, clearData: boolean = false): void {
		if (clearData) {
			this.#data.clear();
		}
		this.#data.bars().merge(data);

		this.#paneView.update('data');

		const sourcePane = this.model().paneForSource(this);
		this.model().recalculatePane(sourcePane);
		this.model().updateSource(this);
		this.model().updateCrosshair();
		this.model().lightUpdate();
	}

	public palette(): Palette {
		return this.#palette;
	}

	public seriesType(): T {
		return this.#seriesType;
	}

	public firstValue(): FirstValue | null {
		const bar = this.firstBar();
		if (bar === null) {
			return null;
		}

		return {
			value: this.#barFunction(bar.value),
			timePoint: bar.time,
		};
	}

	public firstBar(): Bar | null {
		const visibleBars = this.model().timeScale().visibleBars();
		if (visibleBars === null) {
			return null;
		}

		const startTimePoint = visibleBars.firstBar();
		return this.data().search(startTimePoint, PlotRowSearchMode.NearestRight);
	}

	public bars(): PlotList<Bar['time'], Bar['value']> {
		return this.#data.bars();
	}

	public nearestIndex(index: TimePointIndex, options?: PlotRowSearchMode): TimePointIndex | null {
		const res = this.nearestData(index, options);
		return res ? res.index : null;
	}

	public nearestData(index: TimePointIndex, options?: PlotRowSearchMode): PlotRow<Bar['time'], Bar['value']> | null {
		if (!isInteger(index)) {
			return null;
		}

		return this.data().search(index, options);
	}

	public dataAt(time: TimePointIndex): SeriesDataAtTypeMap[SeriesType] | null {
		const prices = this.data().valueAt(time);
		if (prices === null) {
			return null;
		}
		if (this.#seriesType === 'Candlestick') {
			return {
				open: prices.value[SeriesPlotIndex.Open] as BarPrice,
				high: prices.value[SeriesPlotIndex.High] as BarPrice,
				low: prices.value[SeriesPlotIndex.Low] as BarPrice,
				close: prices.value[SeriesPlotIndex.Close] as BarPrice,
			};
		} else {
			return this.barFunction()(prices.value);
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
		if (!isInteger(startTimePoint) || !isInteger(endTimePoint) || this.data().isEmpty()) {
			return null;
		}

		// TODO: refactor this
		// series data is strongly hardcoded to keep bars
		const priceSource = (this.#seriesType === 'Line') ? 'close' : null;
		let barsMinMax: MinMax | null;
		if (priceSource !== null) {
			barsMinMax = this.data().bars().minMaxOnRangeCached(startTimePoint, endTimePoint, [{ name: priceSource, offset: 0 }]);
		} else {
			barsMinMax = this.data().bars().minMaxOnRangeCached(startTimePoint, endTimePoint, [{ name: 'low', offset: 0 }, { name: 'high', offset: 0 }]);
		}

		let range = barsMinMax !== null ? new PriceRange(barsMinMax.min, barsMinMax.max) : null;

		return {
			priceRange: range,
			margins: null,
		};
	}

	public minMove(): number {
		return this.#options.priceFormat.minMove;
	}

	public formatter(): IPriceFormatter {
		return this.#formatter;
	}

	public barFunction(): BarFunction {
		return this.#barFunction;
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
		const bar = this.#data.valueAt(index);
		if (bar === null) {
			return null;
		}
		const price = this.#barFunction(bar.value);
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

	#updateBarFunction(): void {
		const priceSource = 'close';
		this.#barFunction = barFunction(priceSource);
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
