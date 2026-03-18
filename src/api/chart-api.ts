import { ChartWidget, type MouseEventParamsImpl, type MouseEventParamsImplSupplier } from '../gui/chart-widget';

import { ensureDefined } from '../helpers/assertions';
import { Delegate } from '../helpers/delegate';
import { clone, type DeepPartial, isBoolean, merge } from '../helpers/strict-type-checks';

import type { BarPrice, BarPrices } from '../model/bar';
import type { ChartOptions, ChartOptionsInternal } from '../model/chart-model';
import { Series } from '../model/series';
import {
	type CandlestickSeriesOptions,
	type CandlestickSeriesPartialOptions,
	fillUpDownCandlesticksColors,
	type LineSeriesOptions,
	type LineSeriesPartialOptions,
	precisionByMinMove,
	type PriceFormat,
	type PriceFormatBuiltIn,
	type SeriesType,
} from '../model/series-options';
import type { TimePointIndex } from '../model/time-scale/time-data';

import { CandlestickSeriesApi } from './candlestick-series-api';
import type { DataUpdatesConsumer, SeriesDataItemTypeMap } from './data-consumer';
import { DataLayer, type SeriesUpdatePacket } from './data-layer';
import type { IChartApi, MouseEventHandler, MouseEventParams, TimeRangeChangeEventHandler } from './ichart-api';
import type { IPriceScaleApi } from './iprice-scale-api';
import type { ISeriesApi } from './iseries-api';
import type { ITimeScaleApi, TimeRange } from './itime-scale-api';
import { chartOptionsDefaults } from './options/chart-options-defaults';
import {
	candlestickStyleDefaults,
	lineStyleDefaults,
	seriesOptionsDefaults,
} from './options/series-options-defaults';
import { PriceScaleApi } from './price-scale-api';
import { SeriesApi } from './series-api';
import { TimeScaleApi } from './time-scale-api';

function patchPriceFormat(priceFormat?: DeepPartial<PriceFormat>): void {
	if (priceFormat === undefined || priceFormat.type === 'custom') {
		return;
	}
	const priceFormatBuiltIn = priceFormat as DeepPartial<PriceFormatBuiltIn>;
	if (priceFormatBuiltIn.minMove !== undefined && priceFormatBuiltIn.precision === undefined) {
		priceFormatBuiltIn.precision = precisionByMinMove(priceFormatBuiltIn.minMove);
	}
}

function toInternalOptions(options: DeepPartial<ChartOptions>): DeepPartial<ChartOptionsInternal> {
	const handleScale = options.handleScale;
	if (isBoolean(handleScale)) {
		options.handleScale = {
			axisDoubleClickReset: handleScale,
			axisPressedMouseMove: handleScale,
			mouseWheel: handleScale,
			pinch: handleScale,
		};
	}

	const handleScroll = options.handleScroll;
	if (isBoolean(handleScroll)) {
		options.handleScroll = {
			horzTouchDrag: handleScroll,
			vertTouchDrag: handleScroll,
			mouseWheel: handleScroll,
			pressedMouseMove: handleScroll,
		};
	}

	return options as DeepPartial<ChartOptionsInternal>;
}

export class ChartApi implements IChartApi, DataUpdatesConsumer<SeriesType> {
	#chartWidget: ChartWidget;
	#dataLayer: DataLayer = new DataLayer();
	readonly #timeRangeChanged: Delegate<TimeRange | null> = new Delegate();
	readonly #seriesMap: Map<SeriesApi<SeriesType>, Series> = new Map();
	readonly #seriesMapReversed: Map<Series, SeriesApi<SeriesType>> = new Map();

	readonly #clickedDelegate: Delegate<MouseEventParams> = new Delegate();
	readonly #crosshairMovedDelegate: Delegate<MouseEventParams> = new Delegate();

	readonly #priceScaleApi: PriceScaleApi;
	readonly #timeScaleApi: TimeScaleApi;

	public constructor(container: HTMLElement, options?: DeepPartial<ChartOptions>) {
		const internalOptions = (options === undefined) ?
			clone(chartOptionsDefaults) :
			merge(clone(chartOptionsDefaults), toInternalOptions(options)) as ChartOptionsInternal;

		this.#chartWidget = new ChartWidget(container, internalOptions);
		this.#chartWidget.model().timeScale().visibleBarsChanged().subscribe(this.#onVisibleBarsChanged.bind(this));

		this.#chartWidget.clicked().subscribe(
			(paramSupplier: MouseEventParamsImplSupplier) => {
				if (this.#clickedDelegate.hasListeners()) {
					this.#clickedDelegate.fire(this.#convertMouseParams(paramSupplier()));
				}
			},
			this
		);
		this.#chartWidget.crosshairMoved().subscribe(
			(paramSupplier: MouseEventParamsImplSupplier) => {
				if (this.#crosshairMovedDelegate.hasListeners()) {
					this.#crosshairMovedDelegate.fire(this.#convertMouseParams(paramSupplier()));
				}
			},
			this
		);

		const model = this.#chartWidget.model();
		this.#priceScaleApi = new PriceScaleApi(model);
		this.#timeScaleApi = new TimeScaleApi(model);
	}

	public remove(): void {
		this.#chartWidget.model().timeScale().visibleBarsChanged().unsubscribeAll(this);
		this.#chartWidget.clicked().unsubscribeAll(this);
		this.#chartWidget.crosshairMoved().unsubscribeAll(this);
		this.#priceScaleApi.destroy();
		this.#timeScaleApi.destroy();
		this.#chartWidget.destroy();
		(this.#chartWidget as unknown as null) = null;
		this.#seriesMap.forEach((series: Series, api: SeriesApi<SeriesType>) => {
			api.destroy();
		});
		this.#seriesMap.clear();
		this.#seriesMapReversed.clear();
		this.#timeRangeChanged.destroy();
		this.#clickedDelegate.destroy();
		this.#crosshairMovedDelegate.destroy();
		this.#dataLayer.destroy();
		(this.#dataLayer as unknown as null)
	}

	public resize(width: number, height: number, forceRepaint?: boolean): void {
		this.#chartWidget.resize(width, height, forceRepaint);
	}

	public addCandlestickSeries(options: CandlestickSeriesPartialOptions = {}): ISeriesApi<'Candlestick'> {
		fillUpDownCandlesticksColors(options);
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), candlestickStyleDefaults, options) as CandlestickSeriesOptions;
		const series = this.#chartWidget.model().createSeries('Candlestick', strictOptions);

		const res = new CandlestickSeriesApi(series, this);
		this.#seriesMap.set(res, series);
		this.#seriesMapReversed.set(series, res);

		return res;
	}

	public addLineSeries(options: LineSeriesPartialOptions = {}): ISeriesApi<'Line'> {
		patchPriceFormat(options.priceFormat);

		const strictOptions = merge(clone(seriesOptionsDefaults), lineStyleDefaults, options) as LineSeriesOptions;
		const series = this.#chartWidget.model().createSeries('Line', strictOptions);

		const res = new SeriesApi<'Line'>(series, this);
		this.#seriesMap.set(res, series);
		this.#seriesMapReversed.set(series, res);

		return res;
	}

	public removeSeries(seriesApi: ISeriesApi<SeriesType>): void {
		const seriesObj = seriesApi as SeriesApi<SeriesType>;
		const series = ensureDefined(this.#seriesMap.get(seriesObj));

		const update = this.#dataLayer.removeSeries(series);
		const model = this.#chartWidget.model();
		model.removeSeries(series);
		const timeScaleUpdate = update.timeScaleUpdate;
		model.updateTimeScale(timeScaleUpdate.index, timeScaleUpdate.changes, timeScaleUpdate.marks, true);
		timeScaleUpdate.seriesUpdates.forEach((value: SeriesUpdatePacket, key: Series) => {
			key.updateData(value.update);
		});
		model.updateTimeScaleBaseIndex(0 as TimePointIndex);
		this.#seriesMap.delete(seriesObj);
		this.#seriesMapReversed.delete(series);
	}

	public applyNewData<TSeriesType extends SeriesType>(series: Series<TSeriesType>, data: SeriesDataItemTypeMap[TSeriesType][]): void {
		const update = this.#dataLayer.setSeriesData(series, data);
		const model = this.#chartWidget.model();
		const timeScaleUpdate = update.timeScaleUpdate;
		model.updateTimeScale(timeScaleUpdate.index, timeScaleUpdate.changes, timeScaleUpdate.marks, true);
		timeScaleUpdate.seriesUpdates.forEach((value: SeriesUpdatePacket, key: Series) => {
			// the latest arg `true` must be removed in https://github.com/tradingview/lightweight-charts/issues/270
			// here we don't need to clear palettes because they were just filled in DataLayer
			// see https://github.com/tradingview/lightweight-charts/pull/330#discussion_r379415805
			key.updateData(value.update, true);
		});
		model.updateTimeScaleBaseIndex(0 as TimePointIndex);
	}

	public updateData<TSeriesType extends SeriesType>(series: Series<TSeriesType>, data: SeriesDataItemTypeMap[TSeriesType]): void {
		const update = this.#dataLayer.updateSeriesData(series, data);
		const model = this.#chartWidget.model();
		const timeScaleUpdate = update.timeScaleUpdate;
		model.updateTimeScale(timeScaleUpdate.index, timeScaleUpdate.changes, timeScaleUpdate.marks, false);
		timeScaleUpdate.seriesUpdates.forEach((value: SeriesUpdatePacket, key: Series) => {
			key.updateData(value.update);
		});
		model.updateTimeScaleBaseIndex(0 as TimePointIndex);
	}

	public subscribeClick(handler: MouseEventHandler): void {
		this.#clickedDelegate.subscribe(handler);
	}

	public unsubscribeClick(handler: MouseEventHandler): void {
		this.#clickedDelegate.unsubscribe(handler);
	}

	public subscribeCrosshairMove(handler: MouseEventHandler): void {
		this.#crosshairMovedDelegate.subscribe(handler);
	}

	public unsubscribeCrosshairMove(handler: MouseEventHandler): void {
		this.#crosshairMovedDelegate.unsubscribe(handler);
	}

	public subscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler): void {
		this.#timeRangeChanged.subscribe(handler);
	}

	public unsubscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler): void {
		this.#timeRangeChanged.unsubscribe(handler);
	}

	// TODO: add more subscriptions

	public priceScale(): IPriceScaleApi {
		return this.#priceScaleApi;
	}

	public timeScale(): ITimeScaleApi {
		return this.#timeScaleApi;
	}

	public applyOptions(options: DeepPartial<ChartOptions>): void {
		this.#chartWidget.applyOptions(toInternalOptions(options));
	}

	public options(): Readonly<ChartOptions> {
		return this.#chartWidget.options() as Readonly<ChartOptions>;
	}

	public takeScreenshot(): HTMLCanvasElement {
		return this.#chartWidget.takeScreenshot();
	}

	#onVisibleBarsChanged(): void {
		if (this.#timeRangeChanged.hasListeners()) {
			this.#timeRangeChanged.fire(this.timeScale().getVisibleRange());
		}
	}

	#mapSeriesToApi(series: Series): ISeriesApi<SeriesType> {
		return ensureDefined(this.#seriesMapReversed.get(series));
	}

	#convertMouseParams(param: MouseEventParamsImpl): MouseEventParams {
		const seriesPrices = new Map<ISeriesApi<SeriesType>, BarPrice | BarPrices>();
		param.seriesPrices.forEach((price: BarPrice | BarPrices, series: Series) => {
			seriesPrices.set(this.#mapSeriesToApi(series), price);
		});

		const hoveredSeries = param.hoveredSeries === undefined ? undefined : this.#mapSeriesToApi(param.hoveredSeries);

		return {
			time: param.time && (param.time.businessDay || param.time.timestamp),
			point: param.point,
			hoveredSeries,
			seriesPrices,
		};
	}
}
