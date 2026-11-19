import { type DeepPartial, merge } from '../helpers/strict-type-checks';

import type { Coordinate } from './coordinate';
import { createCrosshair, type Crosshair, CrosshairMode, type CrosshairOptions } from './crosshair';
import { DataStore, type SortedTimes, UpdateKind } from './data-store';
import type { GridOptions } from './grid';
import type { LayoutOptions } from './layout-options';
import type { LocalizationOptions } from './localization-options';
import { Pane } from './pane';
import type { PriceScaleOptions } from './price-scale/price-scale';
import { Series } from './series';
import type { SeriesKind } from './series-kind';
import type { SeriesOptionsMap, SeriesType } from './series-options';
import type { TimePointIndex, TimeSecondsRange } from './time-scale/time-data';
import { TimeScale, type TimeScaleOptions } from './time-scale/time-scale';
import type { WatermarkOptions } from './watermark';

export interface HandleScrollOptions {
	mouseWheel: boolean;
	pressedMouseMove: boolean;
	horzTouchDrag: boolean;
	vertTouchDrag: boolean;
}

export interface HandleScaleOptions {
	mouseWheel: boolean;
	pinch: boolean;
	axisPressedMouseMove: boolean;
	axisDoubleClickReset: boolean;
}

/** How much of the chart a change makes out of date. A frame draws for the highest level since the last frame. */
export const enum InvalidationLevel {
	None = 0,
	/** Only the overlay: crosshair lines, markers and labels. */
	Cursor = 1,
	/** All content. The price axis keeps its width or becomes wider. */
	Light = 2,
	/** All content, with a new width of the price axis. */
	Full = 3,
}

/** Called for each change. It must not draw: it schedules a frame. */
type InvalidateHandler = (level: InvalidationLevel) => void;

/**
 * Structure describing options of the chart. Series options are to be set separately
 */
export interface ChartOptions {
	/** Width of the chart */
	width: number;
	/** Height of the chart */
	height: number;
	/** Structure with watermark options */
	watermark: WatermarkOptions;
	/** Structure with layout options */
	layout: LayoutOptions;
	/** Structure with price scale options */
	priceScale: PriceScaleOptions;
	/** Structure with time scale options */
	timeScale: TimeScaleOptions;
	/** Structure with crosshair options */
	crosshair: CrosshairOptions;
	/** Structure with grid options */
	grid: GridOptions;
	/** Structure with localization options */
	localization: LocalizationOptions;
	/** Structure that describes scrolling behavior or boolean flag that disables/enables all kinds of scrolls */
	handleScroll: HandleScrollOptions | boolean;
	/** Structure that describes scaling behavior or boolean flag that disables/enables all kinds of scales */
	handleScale: HandleScaleOptions | boolean;
}

export type ChartOptionsInternal =
	Omit<ChartOptions, 'handleScroll' | 'handleScale'>
	& {
		handleScroll: HandleScrollOptions;
		handleScale: HandleScaleOptions;
	};

export class ChartModel {
	readonly #options: ChartOptionsInternal;
	readonly #invalidateHandler: InvalidateHandler;

	readonly #dataStore: DataStore = new DataStore();
	readonly #timeScale: TimeScale;
	readonly #panes: Pane[] = [];
	readonly #crosshair: Crosshair = createCrosshair();
	#crosshairDirty: boolean = false;

	// requests that the next frame applies before it draws
	#fitContentRequest: boolean = false;
	#timeRangeRequest: TimeSecondsRange | null = null;

	public constructor(invalidateHandler: InvalidateHandler, options: ChartOptionsInternal) {
		this.#invalidateHandler = invalidateHandler;
		this.#options = options;

		this.#timeScale = new TimeScale(this, options.timeScale, this.#options.localization);
		this.#createPane();
	}

	// ---- invalidation

	public fullUpdate(): void {
		this.#invalidateHandler(InvalidationLevel.Full);
	}

	public lightUpdate(): void {
		this.#invalidateHandler(InvalidationLevel.Light);
	}

	// ---- options

	public options(): Readonly<ChartOptionsInternal> {
		return this.#options;
	}

	public applyOptions(options: DeepPartial<ChartOptionsInternal>): void {
		merge(this.#options, options);

		if (options.priceScale !== undefined) {
			for (const pane of this.#panes) {
				pane.priceScale.applyOptions(options.priceScale);
			}
		}

		if (options.timeScale !== undefined) {
			this.#timeScale.applyOptions(options.timeScale);
		}

		if (options.localization !== undefined) {
			this.#timeScale.resetLabels();
			for (const pane of this.#panes) {
				pane.priceScale.updateFormatter();
			}
		}

		this.fullUpdate();
	}

	// ---- parts

	public dataStore(): DataStore {
		return this.#dataStore;
	}

	public timeScale(): TimeScale {
		return this.#timeScale;
	}

	public panes(): ReadonlyArray<Pane> {
		return this.#panes;
	}

	public crosshair(): Readonly<Crosshair> {
		return this.#crosshair;
	}

	// ---- size

	/** Sets the width of the panes and the height of each pane, then calculates the scales again. */
	public setSize(width: number, paneHeights: ArrayLike<number>): void {
		this.#timeScale.setWidth(width);
		for (let i = 0; i < this.#panes.length; i++) {
			this.#panes[i].setHeight(paneHeights[i]);
		}
		this.recalculateAllPanes();
	}

	// ---- series and panes

	/**
	 * Adds a series to the pane with the given index. The index can be equal to the
	 * number of panes: then the model makes a new pane.
	 */
	public createSeries<T extends SeriesType>(kind: SeriesKind<T>, options: SeriesOptionsMap[T], paneIndex: number = 0): Series<T> {
		if (paneIndex < 0 || paneIndex > this.#panes.length) {
			throw new Error(`Invalid pane index ${paneIndex}: the chart has ${this.#panes.length} panes`);
		}

		const pane = paneIndex === this.#panes.length ? this.#createPane() : this.#panes[paneIndex];
		const series = pane.createSeries(kind, options);

		// the first series changes the geometry of the chart
		this.fullUpdate();
		return series;
	}

	/** Removes a series and its data. A pane that has no series after this is removed, but not the first pane. */
	public removeSeries(series: Series): void {
		const pane = series.pane();
		pane.removeSeries(series);
		const paneIndex = this.#panes.indexOf(pane);
		if (pane.series.length === 0 && paneIndex > 0) {
			this.#panes.splice(paneIndex, 1);
			if (this.#crosshair.pane === pane) {
				this.clearCrosshairPosition();
			}
		}

		series.destroy();
		this.#onAllTimePointsChanged();
		this.fullUpdate();
	}

	// ---- data

	/**
	 * Replaces all data of a series. The model takes ownership of the arrays.
	 */
	public setSeriesData(series: Series, times: SortedTimes, values: Float64Array, businessDay: boolean): void {
		if (times.length !== 0) {
			this.#dataStore.businessDay = businessDay;
		}
		this.#dataStore.setSeriesData(series.store(), times, values);
		this.#onAllTimePointsChanged();
	}

	/** Streaming update: new values for the last bar of the series, or a new bar. */
	public updateSeriesData(series: Series, time: number, v0: number, v1: number, v2: number, v3: number): void {
		const store = this.#dataStore;
		const kind = store.updateSeries(series.store(), time, v0, v1, v2, v3);

		if (kind === UpdateKind.Rebuild) {
			this.#onAllTimePointsChanged();
			return;
		}

		if (kind === UpdateKind.InPlace) {
			// the time scale does not change: only the pane of the series needs new prices
			series.pane().recalculate();
			this.updateCrosshair();
			this.lightUpdate();
			return;
		}

		if (kind === UpdateKind.AppendTime) {
			this.#timeScale.timePointAdded();
		}

		this.#timePointsChanged();
	}

	// ---- requests

	/** Call after a drag changed a price scale. */
	public priceScaleChanged(): void {
		this.updateCrosshair();
		this.lightUpdate();
	}

	/** The next frame shows all time points. */
	public fitContent(): void {
		this.#fitContentRequest = true;
		this.#timeRangeRequest = null;
		this.lightUpdate();
	}

	/** The next frame shows the given range of time. */
	public setTargetTimeRange(range: TimeSecondsRange): void {
		this.#fitContentRequest = false;
		this.#timeRangeRequest = range;
		this.lightUpdate();
	}

	/**
	 * Applies the requests for the next frame: "fit content" and a time range.
	 * A frame calls this before the layout.
	 */
	public applyRequests(): void {
		if (this.#fitContentRequest) {
			this.#fitContentRequest = false;
			this.#timeScale.fitContent();
		}

		const range = this.#timeRangeRequest;
		if (range !== null) {
			this.#timeRangeRequest = null;
			this.#timeScale.setTimeRange(range);
		}
	}

	/** Marks the price range of all price scales with autoscale for a new calculation. */
	public recalculateAllPanes(): void {
		for (const pane of this.#panes) {
			pane.recalculate();
		}
		this.updateCrosshair();
	}

	// ---- crosshair

	/** Sets the pointer position (CSS pixels in the pane). The crosshair is calculated in the next frame. */
	public setCrosshairPosition(x: number, y: number, pane: Pane): void {
		const crosshair = this.#crosshair;
		crosshair.originX = x;
		crosshair.originY = y;
		crosshair.pane = pane;
		this.#crosshairDirty = true;
		this.#invalidateHandler(InvalidationLevel.Cursor);
	}

	public clearCrosshairPosition(): void {
		const crosshair = this.#crosshair;
		crosshair.pane = null;
		crosshair.originX = NaN;
		crosshair.originY = NaN;
		this.#crosshairDirty = true;
		this.#invalidateHandler(InvalidationLevel.Cursor);
	}

	/** Call when a scale changed: the crosshair must be calculated again from the pointer position. */
	public updateCrosshair(): void {
		if (this.#crosshair.pane !== null) {
			this.#crosshairDirty = true;
		}
	}

	/**
	 * Calculates the crosshair from the pointer position, if something changed since the
	 * last call. The draw step calls this one time for each frame.
	 * @returns true if the crosshair was calculated again
	 */
	public resolveCrosshair(): boolean {
		if (!this.#crosshairDirty) {
			return false;
		}
		this.#crosshairDirty = false;

		const crosshair = this.#crosshair;
		const pane = crosshair.pane;
		const timeScale = this.#timeScale;

		if (pane === null) {
			const count = this.#dataStore.length;
			crosshair.index = (count !== 0 ? count - 1 : NaN) as TimePointIndex;
			crosshair.price = NaN;
			crosshair.x = NaN;
			crosshair.y = NaN;
			return true;
		}

		let index = timeScale.coordinateToIndex(crosshair.originX as Coordinate);
		const visibleBars = timeScale.visibleBars();
		if (visibleBars !== null) {
			index = Math.min(Math.max(visibleBars.first, index), visibleBars.last) as TimePointIndex;
		}

		crosshair.index = index;
		crosshair.x = isNaN(index) ? NaN : timeScale.indexToCoordinate(index);

		const priceScale = pane.priceScale;
		const firstValue = pane.series.length !== 0 && !priceScale.isEmpty() ? priceScale.firstValue() : null;
		if (firstValue !== null) {
			crosshair.price = priceScale.coordinateToPrice(crosshair.originY as Coordinate, firstValue);
			if (this.#options.crosshair.mode === CrosshairMode.Magnet) {
				// the close price of the bar of the first series of the scale, if there is a bar
				const store = priceScale.sources()[0].store();
				const row = store.rowAt(index);
				if (row >= 0) {
					crosshair.price = store.closeAt(row);
				}
			}
			crosshair.y = priceScale.priceToCoordinate(crosshair.price, firstValue);
		} else {
			crosshair.price = NaN;
			crosshair.y = NaN;
		}

		return true;
	}

	// ---- private

	#createPane(): Pane {
		const pane = new Pane(this);
		this.#panes.push(pane);
		this.fullUpdate();
		return pane;
	}

	#onAllTimePointsChanged(): void {
		this.#timeScale.reset();
		this.#timePointsChanged();
	}

	#timePointsChanged(): void {
		this.recalculateAllPanes();
		this.lightUpdate();
	}


}
