import type { DeepPartial } from '../helpers/strict-type-checks';

import type { BarPrice, BarPrices } from '../model/bar';
import type { ChartOptions } from '../model/chart-model';
import type { SeriesSpec } from '../model/series-kind';
import type { SeriesType } from '../model/series-options';
import type { BusinessDay, UTCTimestamp } from '../model/time-scale/time-data';

import type { IPaneApi } from './ipane-api';
import type { IPriceScaleApi } from './iprice-scale-api';
import type { ISeriesApi } from './iseries-api';
import type { ITimeScaleApi, TimeRange } from './itime-scale-api';

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface MouseEventParams {
	time?: UTCTimestamp | BusinessDay;
	point?: Point;
	seriesPrices: Map<ISeriesApi<SeriesType>, BarPrice | BarPrices>;
}

export type MouseEventHandler = (param: MouseEventParams) => void;
export type TimeRangeChangeEventHandler = (timeRange: TimeRange | null) => void;

/**
 * The main interface of a single chart
 */
export interface IChartApi {
	/**
	 * Removes the chart object including all DOM elements. This is an irreversible operation, you cannot do anything with the chart after removing it.
	 */
	remove(): void;

	/**
	 * Sets the size of the chart. If the options give no width and no height, the chart measures
	 * its container one time, when it is created. It does not follow a later change of the size
	 * of the container: call this method for that.
	 * @param width - target width of the chart
	 * @param height - target height of the chart
	 * @param forceRepaint - true to draw immediately and not in the next frame. This is necessary to get a screenshot immediately after the call
	 */
	resize(width: number, height: number, forceRepaint?: boolean): void;

	/**
	 * Creates a series. The argument holds the type of the series and its options:
	 * `chart.addSeries(Line({ color: 'red' }))`, `chart.addSeries(Candlestick({ pane: 1 }))`.
	 * @param spec - the result of `Line()`, `Candlestick()` or another series function
	 * @returns an interface of the created series
	 */
	addSeries<T extends SeriesType>(spec: SeriesSpec<T>): ISeriesApi<T>;

	/**
	 * Removes a series of any type. This is an irreversible operation, you cannot do anything with the series after removing it
	 */
	removeSeries(seriesApi: ISeriesApi<SeriesType>): void;

	/**
	 * Adds a subscription to mouse click event
	 * @param handler - handler (function) to be called on mouse click
	 */
	subscribeClick(handler: MouseEventHandler): void;

	/**
	 * Removes mouse click subscription
	 * @param handler - previously subscribed handler
	 */
	unsubscribeClick(handler: MouseEventHandler): void;

	/**
	 * Adds a subscription to crosshair movement to receive notifications on crosshair movements
	 * @param handler - handler (function) to be called on crosshair move
	 */
	subscribeCrosshairMove(handler: MouseEventHandler): void;

	/**
	 * Removes a subscription on crosshair movement
	 * @param handler - previously subscribed handler
	 */
	unsubscribeCrosshairMove(handler: MouseEventHandler): void;

	/**
	 * Adds a subscription to visible range changes to receive notification about visible range of data changes
	 * @param handler - handler (function) to be called on changing visible data range
	 */
	subscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler): void;

	/**
	 * Removes a subscription to visible range changes
	 * @param handler - previously subscribed handler
	 */
	unsubscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler): void;

	/**
	 * Returns one interface for each pane, from top to bottom.
	 * A series with the option `pane` equal to the number of panes makes a new pane.
	 */
	panes(): IPaneApi[];

	/**
	 * Returns API to manipulate the price scale
	 * @returns - target API
	 */
	priceScale(): IPriceScaleApi;

	/**
	 * Returns API to manipulate the time scale
	 * @returns - target API
	 */
	timeScale(): ITimeScaleApi;

	/**
	 * Applies new options to the chart
	 * @param options - any subset of chart options
	 */
	applyOptions(options: DeepPartial<ChartOptions>): void;

	/**
	 * Returns currently applied options
	 * @returns - full set of currently applied options, including defaults
	 */
	options(): Readonly<ChartOptions>;

	/**
	 * Make a screenshot of the chart with all the elements excluding crosshair.
	 * @returns a canvas with the chart drawn on
	 */
	takeScreenshot(): HTMLCanvasElement;
}
