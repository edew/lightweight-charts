import { ChartWidget, type Point } from '../gui/chart-widget';

import { ensureDefined } from '../helpers/assertions';
import { Delegate } from '../helpers/delegate';
import { clone, type DeepPartial, isBoolean, merge } from '../helpers/strict-type-checks';

import type { BarPrice, BarPrices } from '../model/bar';
import type { ChartModel, ChartOptions, ChartOptionsInternal } from '../model/chart-model';
import type { Pane } from '../model/pane';
import type { PriceScaleOptions } from '../model/price-scale/price-scale';
import type { Series } from '../model/series';
import type { SeriesSpec } from '../model/series-kind';
import type { SeriesType } from '../model/series-options';
import type { TimePointIndex } from '../model/time-scale/time-data';

import { secondsToTime } from './data-convert';
import type { IChartApi, MouseEventHandler, MouseEventParams, TimeRangeChangeEventHandler } from './ichart-api';
import type { IPaneApi } from './ipane-api';
import type { IPriceScaleApi } from './iprice-scale-api';
import type { ISeriesApi } from './iseries-api';
import type { ITimeScaleApi, TimeRange } from './itime-scale-api';
import { chartOptionsDefaults } from './options/chart-options-defaults';
import { SeriesApi, seriesOptionsFromSpec } from './series-api';
import { TimeScaleApi } from './time-scale-api';

/** Makes a copy of the options of the user in the internal form. The input is not changed. */
function toInternalOptions(userOptions: DeepPartial<ChartOptions>): DeepPartial<ChartOptionsInternal> {
	const options = clone(userOptions);

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

function paneApi(model: ChartModel, pane: Pane): IPaneApi {
	return {
		height: () => pane.height(),
		stretchFactor: () => pane.stretch,
		setStretchFactor: (factor: number) => {
			pane.stretch = factor;
			model.fullUpdate();
		},
		applyPriceScaleOptions: (options: DeepPartial<Omit<PriceScaleOptions, 'position'>>) => {
			pane.priceScale.applyOptions(options);
			model.fullUpdate();
		},
		priceScaleOptions: () => clone(pane.priceScale.options()),
	};
}

export class ChartApi implements IChartApi {
	readonly #chartWidget: ChartWidget;
	readonly #seriesApis: Map<Series, SeriesApi<SeriesType>> = new Map();

	readonly #timeRangeChanged: Delegate<TimeRange | null> = new Delegate();
	readonly #clicked: Delegate<MouseEventParams> = new Delegate();
	readonly #crosshairMoved: Delegate<MouseEventParams> = new Delegate();

	readonly #priceScaleApi: IPriceScaleApi;
	readonly #timeScaleApi: TimeScaleApi;

	public constructor(container: HTMLElement, options?: DeepPartial<ChartOptions>) {
		const internalOptions = (options === undefined) ?
			clone(chartOptionsDefaults) :
			merge(clone(chartOptionsDefaults), toInternalOptions(options));

		this.#chartWidget = new ChartWidget(container, internalOptions);
		const model = this.#chartWidget.model();

		model.timeScale().visibleBarsChanged().subscribe(
			() => {
				if (this.#timeRangeChanged.hasListeners()) {
					this.#timeRangeChanged.fire(this.#timeScaleApi.getVisibleRange());
				}
			},
			this
		);

		this.#chartWidget.onClick = (index: TimePointIndex | null, point: Point | null) => {
			if (this.#clicked.hasListeners()) {
				this.#clicked.fire(this.#mouseEventParams(index, point));
			}
		};
		this.#chartWidget.onCrosshairMove = (index: TimePointIndex | null, point: Point | null) => {
			if (this.#crosshairMoved.hasListeners()) {
				this.#crosshairMoved.fire(this.#mouseEventParams(index, point));
			}
		};

		this.#priceScaleApi = {
			applyOptions: (priceScaleOptions: DeepPartial<PriceScaleOptions>) => model.applyOptions({ priceScale: priceScaleOptions }),
			options: () => clone(model.options().priceScale),
		};
		this.#timeScaleApi = new TimeScaleApi(model);
	}

	public remove(): void {
		this.#chartWidget.model().timeScale().visibleBarsChanged().unsubscribeAll(this);
		this.#timeScaleApi.destroy();
		this.#chartWidget.destroy();
		this.#seriesApis.clear();
		this.#timeRangeChanged.destroy();
		this.#clicked.destroy();
		this.#crosshairMoved.destroy();
	}

	public resize(width: number, height: number, forceRepaint?: boolean): void {
		this.#chartWidget.resize(width, height, forceRepaint);
	}

	public addSeries<T extends SeriesType>(spec: SeriesSpec<T>): ISeriesApi<T> {
		const options = seriesOptionsFromSpec(spec);
		const series = this.#chartWidget.model().createSeries(spec.kind, options, options.pane);
		const api = new SeriesApi<T>(series, spec);
		this.#seriesApis.set(series as unknown as Series, api as unknown as SeriesApi<SeriesType>);
		return api;
	}

	public removeSeries(seriesApi: ISeriesApi<SeriesType>): void {
		const api = seriesApi as SeriesApi<SeriesType>;
		const series = api.series();
		ensureDefined(this.#seriesApis.get(series));
		this.#seriesApis.delete(series);
		api.destroy();
	}

	public subscribeClick(handler: MouseEventHandler): void {
		this.#clicked.subscribe(handler);
	}

	public unsubscribeClick(handler: MouseEventHandler): void {
		this.#clicked.unsubscribe(handler);
	}

	public subscribeCrosshairMove(handler: MouseEventHandler): void {
		this.#crosshairMoved.subscribe(handler);
	}

	public unsubscribeCrosshairMove(handler: MouseEventHandler): void {
		this.#crosshairMoved.unsubscribe(handler);
	}

	public subscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler): void {
		this.#timeRangeChanged.subscribe(handler);
	}

	public unsubscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler): void {
		this.#timeRangeChanged.unsubscribe(handler);
	}

	public panes(): IPaneApi[] {
		const model = this.#chartWidget.model();
		return model.panes().map((pane: Pane) => paneApi(model, pane));
	}

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
		return clone(this.#chartWidget.options()) as Readonly<ChartOptions>;
	}

	public takeScreenshot(): HTMLCanvasElement {
		return this.#chartWidget.takeScreenshot();
	}

	#mouseEventParams(index: TimePointIndex | null, point: Point | null): MouseEventParams {
		const model = this.#chartWidget.model();
		const seriesPrices = new Map<ISeriesApi<SeriesType>, BarPrice | BarPrices>();
		let time: MouseEventParams['time'];

		if (index !== null) {
			this.#seriesApis.forEach((api: SeriesApi<SeriesType>, series: Series) => {
				const prices = series.dataAt(index);
				if (prices !== null) {
					seriesPrices.set(api, prices);
				}
			});

			const seconds = model.timeScale().indexToTime(index);
			if (seconds !== null) {
				time = secondsToTime(seconds, model.dataStore().businessDay === true);
			}
		}

		return {
			time,
			point: point ?? undefined,
			seriesPrices,
		};
	}
}
