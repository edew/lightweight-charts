import { assert } from '../helpers/assertions';
import type { IDestroyable } from '../helpers/idestroyable';
import { type DeepPartial, merge } from '../helpers/strict-type-checks';

import type { Coordinate } from './coordinate';
import { createCrosshair, type Crosshair, type CrosshairOptions } from './crosshair';
import { DataStore, UpdateKind } from './data-store';
import type { GridOptions } from './grid';
import { InvalidateMask, InvalidationLevel } from './invalidate-mask';
import type { LayoutOptions } from './layout-options';
import type { LocalizationOptions } from './localization-options';
import { Pane } from './pane';
import type { PriceScale, PriceScaleOptions } from './price-scale/price-scale';
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

type InvalidateHandler = (mask: InvalidateMask) => void;

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

export class ChartModel implements IDestroyable {
	readonly #options: ChartOptionsInternal;
	readonly #invalidateHandler: InvalidateHandler;

	readonly #dataStore: DataStore = new DataStore();
	readonly #timeScale: TimeScale;
	readonly #panes: Pane[] = [];
	readonly #serieses: Series[] = [];
	readonly #crosshair: Crosshair = createCrosshair();
	#crosshairDirty: boolean = false;

	#width: number = 0;
	#initialTimeScrollPos: number | null = null;

	public constructor(invalidateHandler: InvalidateHandler, options: ChartOptionsInternal) {
		this.#invalidateHandler = invalidateHandler;
		this.#options = options;

		this.#timeScale = new TimeScale(this, options.timeScale, this.#options.localization);
		this.#createPane();
	}

	public destroy(): void {
		this.#panes.length = 0;
		this.#serieses.length = 0;

		// to avoid memleaks
		this.#options.localization.priceFormatter = undefined;
		this.#options.localization.timeFormatter = undefined;
	}

	// ---- invalidation

	public fullUpdate(): void {
		this.#invalidate(new InvalidateMask(InvalidationLevel.Full));
	}

	public lightUpdate(): void {
		this.#invalidate(new InvalidateMask(InvalidationLevel.Light));
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
			this.#timeScale.applyLocalizationOptions(options.localization);
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

	public serieses(): ReadonlyArray<Series> {
		return this.#serieses;
	}

	public crosshair(): Readonly<Crosshair> {
		return this.#crosshair;
	}

	// ---- size

	public width(): number {
		return this.#width;
	}

	/** Sets the width of the panes and the height of each pane, then calculates the scales again. */
	public setSize(width: number, paneHeights: ArrayLike<number>): void {
		this.#width = width;
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
		const series = new Series<T>(this, kind, options);
		pane.addSeries(series as unknown as Series, Boolean(options.overlay));
		if (options.overlay) {
			// apply the options again to set the margins of the overlay scale
			series.applyOptions(options);
		}
		this.#serieses.push(series as unknown as Series);

		// the first series changes the geometry of the chart
		this.fullUpdate();
		return series;
	}

	/** Removes a series and its data. A pane that has no series after this is removed, but not the first pane. */
	public removeSeries(series: Series): void {
		const seriesIndex = this.#serieses.indexOf(series);
		assert(seriesIndex !== -1, 'Series not found');
		this.#serieses.splice(seriesIndex, 1);

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
	 * Replaces all data of a series. `times` are sorted UTC seconds with no duplicates.
	 * The model takes ownership of the arrays.
	 */
	public setSeriesData(series: Series, times: Float64Array, values: Float64Array, count: number, businessDay: boolean): void {
		if (count !== 0) {
			this.#dataStore.businessDay = businessDay;
		}
		this.#dataStore.setSeriesData(series.store(), times, values, count);
		this.#onAllTimePointsChanged();
	}

	/** Streaming update: new values for the last bar of the series, or a new bar. */
	public updateSeriesData(series: Series, time: number, v0: number, v1: number, v2: number, v3: number): void {
		const store = this.#dataStore;
		const oldSize = store.length;
		const kind = store.updateSeries(series.store(), time, v0, v1, v2, v3);

		if (kind === UpdateKind.Rebuild) {
			this.#onAllTimePointsChanged();
			return;
		}

		if (kind === UpdateKind.InPlace) {
			// the time scale does not change: only the pane of the series needs new prices
			series.pane().recalculate();
			this.updateCrosshair();
			this.#invalidatePane(series.pane(), InvalidationLevel.Light);
			return;
		}

		if (kind === UpdateKind.AppendTime) {
			this.#timeScale.update(oldSize);
		}

		this.#updateTimeScaleBaseIndex();
	}

	// ---- price scale interaction

	public startScalePrice(priceScale: PriceScale, y: number): void {
		priceScale.startScale(y);
	}

	public scalePriceTo(pane: Pane, priceScale: PriceScale, y: number): void {
		priceScale.scaleTo(y);
		this.updateCrosshair();
		this.#invalidatePane(pane, InvalidationLevel.Light);
	}

	public endScalePrice(pane: Pane, priceScale: PriceScale): void {
		priceScale.endScale();
		this.#invalidatePane(pane, InvalidationLevel.Light);
	}

	public startScrollPrice(priceScale: PriceScale, y: number): void {
		priceScale.startScroll(y);
	}

	public scrollPriceTo(pane: Pane, priceScale: PriceScale, y: number): void {
		if (priceScale.isAutoScale()) {
			return;
		}

		priceScale.scrollTo(y);
		this.updateCrosshair();
		this.#invalidatePane(pane, InvalidationLevel.Light);
	}

	public endScrollPrice(pane: Pane, priceScale: PriceScale): void {
		priceScale.endScroll();
		this.#invalidatePane(pane, InvalidationLevel.Light);
	}

	public setPriceAutoScale(pane: Pane, priceScale: PriceScale, autoScale: boolean): void {
		pane.setPriceAutoScale(priceScale, autoScale);
		this.#invalidatePane(pane, InvalidationLevel.Light);
	}

	public resetPriceScale(pane: Pane, priceScale: PriceScale): void {
		pane.resetPriceScale(priceScale);
		this.#invalidatePane(pane, InvalidationLevel.Light);
	}

	// ---- time scale interaction

	public startScaleTime(position: Coordinate): void {
		this.#timeScale.startScale(position);
	}

	/**
	 * Zoom in/out the chart (depends on scale value).
	 * @param pointX - X coordinate of the point to apply the zoom (the point which should stay on its place)
	 * @param scale - Zoom value. Negative value means zoom out, positive - zoom in.
	 */
	public zoomTime(pointX: Coordinate, scale: number): void {
		const timeScale = this.#timeScale;
		if (timeScale.isEmpty() || scale === 0) {
			return;
		}

		const timeScaleWidth = timeScale.width();
		pointX = Math.max(1, Math.min(pointX, timeScaleWidth)) as Coordinate;

		timeScale.zoom(pointX, scale);
		this.#onTimeScaleMoved();
	}

	public scrollChart(x: Coordinate): void {
		this.startScrollTime(0 as Coordinate);
		this.scrollTimeTo(x);
		this.endScrollTime();
	}

	public scaleTimeTo(x: Coordinate): void {
		this.#timeScale.scaleTo(x);
		this.#onTimeScaleMoved();
	}

	public endScaleTime(): void {
		this.#timeScale.endScale();
		this.lightUpdate();
	}

	public startScrollTime(x: Coordinate): void {
		this.#initialTimeScrollPos = x;
		this.#timeScale.startScroll(x);
	}

	public scrollTimeTo(x: Coordinate): boolean {
		let res = false;
		if (this.#initialTimeScrollPos !== null && Math.abs(x - this.#initialTimeScrollPos) > 20) {
			this.#initialTimeScrollPos = null;
			res = true;
		}

		this.#timeScale.scrollTo(x);
		this.#onTimeScaleMoved();
		return res;
	}

	public endScrollTime(): void {
		this.#timeScale.endScroll();
		this.lightUpdate();
		this.#initialTimeScrollPos = null;
	}

	public resetTimeScale(): void {
		this.#timeScale.restoreDefault();
		this.#onTimeScaleMoved();
	}

	public fitContent(): void {
		const mask = new InvalidateMask(InvalidationLevel.Light);
		mask.setFitContent();
		this.#invalidate(mask);
	}

	public setTargetTimeRange(range: TimeSecondsRange): void {
		const mask = new InvalidateMask(InvalidationLevel.Light);
		mask.setTargetTimeRange(range);
		this.#invalidate(mask);
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
		crosshair.visible = true;
		this.#crosshairDirty = true;
		this.#invalidate(new InvalidateMask(InvalidationLevel.Cursor));
	}

	public clearCrosshairPosition(): void {
		const crosshair = this.#crosshair;
		crosshair.visible = false;
		crosshair.pane = null;
		crosshair.originX = NaN;
		crosshair.originY = NaN;
		this.#crosshairDirty = true;
		this.#invalidate(new InvalidateMask(InvalidationLevel.Cursor));
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
			index = Math.min(Math.max(visibleBars.firstBar(), index), visibleBars.lastBar()) as TimePointIndex;
		}

		crosshair.index = index;
		crosshair.x = isNaN(index) ? NaN : timeScale.indexToCoordinate(index);

		const priceScale = pane.priceScale;
		const firstValue = pane.series.length !== 0 && !priceScale.isEmpty() ? priceScale.firstValue() : null;
		if (firstValue !== null) {
			crosshair.price = priceScale.coordinateToPrice(crosshair.originY as Coordinate, firstValue);
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

		// we always do autoscaling on the creation:
		// if the autoscale option is false, autoscale anyway on the first draw
		const mask = new InvalidateMask(InvalidationLevel.Full);
		mask.invalidatePane(this.#panes.length - 1, {
			level: InvalidationLevel.None,
			autoScale: true,
		});
		this.#invalidate(mask);
		return pane;
	}

	#onTimeScaleMoved(): void {
		this.recalculateAllPanes();
		this.lightUpdate();
	}

	#onAllTimePointsChanged(): void {
		this.#timeScale.reset();
		this.#timeScale.update(0);
		this.#updateTimeScaleBaseIndex();
	}

	#updateTimeScaleBaseIndex(): void {
		// the time points are the union of the times of all series,
		// so the last time point is the last bar of at least one series
		const count = this.#dataStore.length;
		if (count !== 0) {
			// when the user looks at history, TimeScale.update() keeps the visible bars in place
			this.#timeScale.setBaseIndex(count - 1 as TimePointIndex);
		}

		this.recalculateAllPanes();
		this.lightUpdate();
	}

	#invalidatePane(pane: Pane, level: InvalidationLevel): void {
		const mask = new InvalidateMask(level);
		mask.invalidatePane(this.#panes.indexOf(pane), { level });
		this.#invalidate(mask);
	}

	#invalidate(mask: InvalidateMask): void {
		this.#invalidateHandler(mask);
	}
}
