import { assert, ensureNotNull } from '../helpers/assertions';
import { Delegate } from '../helpers/delegate';
import type { IDestroyable } from '../helpers/idestroyable';
import type { ISubscription } from '../helpers/isubscription';
import { type DeepPartial, merge } from '../helpers/strict-type-checks';

import type { PriceAxisViewRendererOptions } from '../renderers/iprice-axis-view-renderer';
import { PriceAxisRendererOptionsProvider } from '../renderers/price-axis-renderer-options-provider';

import type { Coordinate } from './coordinate';
import { Crosshair, type CrosshairOptions } from './crosshair';
import { Grid, type GridOptions } from './grid';
import type { IDataSource } from './data-source/idata-source';
import { InvalidateMask, InvalidationLevel } from './invalidate-mask';
import type { IPriceDataSource } from './data-source/iprice-data-source';
import type { LayoutOptions } from './layout-options';
import type { LocalizationOptions } from './localization-options';
import { DEFAULT_STRETCH_FACTOR, Pane } from './pane';
import type { Point } from './point';
import { PriceScale, type PriceScaleOptions } from './price-scale/price-scale';
import { Series } from './series';
import type { SeriesOptionsMap, SeriesType } from './series-options';
import type { TickMark, TimePoint, TimePointIndex, TimePointsRange } from './time-scale/time-data';
import { TimeScale, type TimeScaleOptions } from './time-scale/time-scale';
import { Watermark, type WatermarkOptions } from './watermark';

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

export interface HoveredObject {
	hitTestData?: unknown;
	externalId?: string;
}

export interface HoveredSource {
	source: IDataSource;
	object?: HoveredObject;
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

	readonly #rendererOptionsProvider: PriceAxisRendererOptionsProvider;

	readonly #timeScale: TimeScale;
	readonly #panes: Pane[] = [];
	readonly #grid: Grid;
	readonly #crosshair: Crosshair;
	readonly #watermark: Watermark;

	#serieses: Series[] = [];

	#width: number = 0;
	#initialTimeScrollPos: number | null = null;
	#hoveredSource: HoveredSource | null = null;
	readonly #mainPriceScaleOptionsChanged: Delegate = new Delegate();
	#crosshairMoved: Delegate<TimePointIndex | null, Point | null> = new Delegate();

	public constructor(invalidateHandler: InvalidateHandler, options: ChartOptionsInternal) {
		this.#invalidateHandler = invalidateHandler;
		this.#options = options;

		this.#rendererOptionsProvider = new PriceAxisRendererOptionsProvider(this);

		this.#timeScale = new TimeScale(this, options.timeScale, this.#options.localization);
		this.#grid = new Grid();
		this.#crosshair = new Crosshair(this, options.crosshair);
		this.#watermark = new Watermark(this, options.watermark);

		this.createPane();
		this.#panes[0].setStretchFactor(DEFAULT_STRETCH_FACTOR * 2);
		this.#panes[0].addDataSource(this.#watermark, true, false);
	}

	public fullUpdate(): void {
		this.#invalidate(new InvalidateMask(InvalidationLevel.Full));
	}

	public lightUpdate(): void {
		this.#invalidate(new InvalidateMask(InvalidationLevel.Light));
	}

	public updateSource(source: IDataSource): void {
		const inv = this.#invalidationMaskForSource(source);
		this.#invalidate(inv);
	}

	public hoveredSource(): HoveredSource | null {
		return this.#hoveredSource;
	}

	public setHoveredSource(source: HoveredSource | null): void {
		const prevSource = this.#hoveredSource;
		this.#hoveredSource = source;
		if (prevSource !== null) {
			this.updateSource(prevSource.source);
		}
		if (source !== null) {
			this.updateSource(source.source);
		}
	}

	public options(): Readonly<ChartOptionsInternal> {
		return this.#options;
	}

	public applyOptions(options: DeepPartial<ChartOptionsInternal>): void {
		// TODO: implement this
		merge(this.#options, options);
		if (options.priceScale !== undefined) {
			this.mainPriceScale().applyOptions(options.priceScale);
			this.#mainPriceScaleOptionsChanged.fire();
		}

		if (options.timeScale !== undefined) {
			this.#timeScale.applyOptions(options.timeScale);
		}

		if (options.localization !== undefined) {
			this.#timeScale.applyLocalizationOptions(options.localization);
			this.mainPriceScale().updateFormatter();
		}

		this.fullUpdate();
	}

	public updateAllPaneViews(): void {
		this.#panes.forEach((p: Pane) => p.updateAllViews());
		this.updateCrosshair();
		this.#grid.updateAllViews();
	}

	public timeScale(): TimeScale {
		return this.#timeScale;
	}

	public panes(): ReadonlyArray<Pane> {
		return this.#panes;
	}

	public gridSource(): Grid {
		return this.#grid;
	}

	public watermarkSource(): Watermark | null {
		return this.#watermark;
	}

	public crosshairSource(): Crosshair {
		return this.#crosshair;
	}

	public crosshairMoved(): ISubscription<TimePointIndex | null, Point | null> {
		return this.#crosshairMoved;
	}

	public width(): number {
		return this.#width;
	}

	public setPaneHeight(pane: Pane, height: number): void {
		pane.setHeight(height);
		this.recalculateAllPanes();
		this.lightUpdate();
	}

	public setWidth(width: number): void {
		this.#width = width;
		this.#timeScale.setWidth(this.#width);
		this.#panes.forEach((pane: Pane) => pane.setWidth(width));
		this.recalculateAllPanes();
	}

	public createPane(index?: number): Pane {
		const pane = new Pane(this.#timeScale, this);

		if (index !== undefined) {
			this.#panes.splice(index, 0, pane);
		} else {
			// adding to the end - common case
			this.#panes.push(pane);
		}

		const actualIndex = (index === undefined) ? this.#panes.length - 1 : index;

		// we always do autoscaling on the creation
		// if autoscale option is true, it is ok, just recalculate by invalidation mask
		// if autoscale option is false, autoscale anyway on the first draw
		// also there is a scenario when autoscale is true in constructor and false later on applyOptions
		const mask = new InvalidateMask(InvalidationLevel.Full);
		mask.invalidatePane(actualIndex, {
			level: InvalidationLevel.None,
			autoScale: true,
		});
		this.invalidate(mask);

		return pane;
	}

	public startScalePrice(pane: Pane, priceScale: PriceScale, x: number): void {
		pane.startScalePrice(priceScale, x);
	}

	public scalePriceTo(pane: Pane, priceScale: PriceScale, x: number): void {
		pane.scalePriceTo(priceScale, x);
		this.updateCrosshair();
		this.#invalidate(this.#paneInvalidationMask(pane, InvalidationLevel.Light));
	}

	public endScalePrice(pane: Pane, priceScale: PriceScale): void {
		pane.endScalePrice(priceScale);
		this.#invalidate(this.#paneInvalidationMask(pane, InvalidationLevel.Light));
	}

	public startScrollPrice(pane: Pane, priceScale: PriceScale, x: number): void {
		if (priceScale.isAutoScale()) {
			return;
		}
		pane.startScrollPrice(priceScale, x);
	}

	public scrollPriceTo(pane: Pane, priceScale: PriceScale, x: number): void {
		if (priceScale.isAutoScale()) {
			return;
		}
		pane.scrollPriceTo(priceScale, x);
		this.updateCrosshair();
		this.#invalidate(this.#paneInvalidationMask(pane, InvalidationLevel.Light));
	}

	public endScrollPrice(pane: Pane, priceScale: PriceScale): void {
		if (priceScale.isAutoScale()) {
			return;
		}
		pane.endScrollPrice(priceScale);
		this.#invalidate(this.#paneInvalidationMask(pane, InvalidationLevel.Light));
	}

	public setPriceAutoScale(pane: Pane, priceScale: PriceScale, autoScale: boolean): void {
		pane.setPriceAutoScale(priceScale, autoScale);
		this.#invalidate(this.#paneInvalidationMask(pane, InvalidationLevel.Light));
	}

	public resetPriceScale(pane: Pane, priceScale: PriceScale): void {
		pane.resetPriceScale(priceScale);
		this.#invalidate(this.#paneInvalidationMask(pane, InvalidationLevel.Light));
	}

	public startScaleTime(position: Coordinate): void {
		this.#timeScale.startScale(position);
	}

	/**
	 * Zoom in/out the chart (depends on scale value).
	 * @param pointX - X coordinate of the point to apply the zoom (the point which should stay on its place)
	 * @param scale - Zoom value. Negative value means zoom out, positive - zoom in.
	 */
	public zoomTime(pointX: Coordinate, scale: number): void {
		const timeScale = this.timeScale();
		if (timeScale.isEmpty() || scale === 0) {
			return;
		}

		const timeScaleWidth = timeScale.width();
		pointX = Math.max(1, Math.min(pointX, timeScaleWidth)) as Coordinate;

		timeScale.zoom(pointX, scale);

		this.updateCrosshair();
		this.recalculateAllPanes();
		this.lightUpdate();
	}

	public scrollChart(x: Coordinate): void {
		this.startScrollTime(0 as Coordinate);
		this.scrollTimeTo(x);
		this.endScrollTime();
	}

	public scaleTimeTo(x: Coordinate): void {
		this.#timeScale.scaleTo(x);
		this.recalculateAllPanes();
		this.updateCrosshair();
		this.lightUpdate();
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
		this.recalculateAllPanes();
		this.updateCrosshair();
		this.lightUpdate();
		return res;
	}

	public endScrollTime(): void {
		this.#timeScale.endScroll();
		this.lightUpdate();

		this.#initialTimeScrollPos = null;
	}

	public resetTimeScale(): void {
		this.#timeScale.restoreDefault();
		this.recalculateAllPanes();
		this.updateCrosshair();
		this.lightUpdate();
	}

	public invalidate(mask: InvalidateMask): void {
		this.#invalidate(mask);
		this.lightUpdate();
	}

	public dataSources(): ReadonlyArray<IDataSource> {
		return this.#panes.reduce((arr: IDataSource[], pane: Pane) => arr.concat(pane.dataSources()), []);
	}

	public serieses(): ReadonlyArray<Series> {
		return this.#serieses;
	}

	public setAndSaveCurrentPosition(x: Coordinate, y: Coordinate, pane: Pane): void {
		this.#crosshair.saveOriginCoord(x, y);
		let price = NaN;
		let index = this.#timeScale.coordinateToIndex(x);

		const visibleBars = this.#timeScale.visibleBars();
		if (visibleBars !== null) {
			index = Math.min(Math.max(visibleBars.firstBar(), index), visibleBars.lastBar()) as TimePointIndex;
		}

		const mainSource = pane.mainDataSource();
		if (mainSource !== null) {
			const priceScale = pane.defaultPriceScale();
			const firstValue = priceScale.firstValue();
			if (firstValue !== null) {
				price = priceScale.coordinateToPrice(y, firstValue);
			}
		}

		this.#crosshair.setPosition(index, price, pane);

		this.#cursorUpdate();
		this.#crosshairMoved.fire(this.#crosshair.appliedIndex(), { x, y });
	}

	public clearCurrentPosition(): void {
		const crosshair = this.crosshairSource();
		crosshair.clearPosition();
		this.#cursorUpdate();
		this.#crosshairMoved.fire(null, null);
	}

	public updateCrosshair(): void {
		const pane = this.#crosshair.pane();
		if (pane !== null) {
			const x = this.#crosshair.originCoordX();
			const y = this.#crosshair.originCoordY();
			this.setAndSaveCurrentPosition(x, y, pane);
		}
	}

	public updateTimeScale(index: TimePointIndex, values: TimePoint[], marks: TickMark[], clearFlag: boolean): void {
		if (clearFlag) {
			// refresh timescale
			this.#timeScale.reset();
		}

		this.#timeScale.update(index, values, marks);
	}

	public updateTimeScaleBaseIndex(earliestRowIndex?: TimePointIndex): void {
		// get the latest series bar index
		const lastSeriesBarIndex = this.#serieses.reduce(
			(currentRes: TimePointIndex | undefined, series: Series) => {
				const seriesBars = series.bars();
				if (seriesBars.isEmpty()) {
					return currentRes;
				}
				const currentLastIndex = ensureNotNull(seriesBars.lastIndex());
				return (currentRes === undefined) ? currentLastIndex : Math.max(currentLastIndex, currentRes) as TimePointIndex;
			},
			undefined);

		if (lastSeriesBarIndex !== undefined) {
			const timeScale = this.#timeScale;
			const currentBaseIndex = timeScale.baseIndex();

			const visibleBars = timeScale.visibleBars();

			// if time scale cannot return current visible bars range (e.g. time scale has zero-width)
			// then we do not need to update right offset to shift visible bars range to have the same right offset as we have before new bar
			// (and actually we cannot)
			if (visibleBars !== null) {
				const isLastSeriesBarVisible = visibleBars.contains(currentBaseIndex);

				if (earliestRowIndex !== undefined && earliestRowIndex > 0 && !isLastSeriesBarVisible) {
					const compensationShift = lastSeriesBarIndex - currentBaseIndex;

					timeScale.setRightOffset(timeScale.rightOffset() - compensationShift);
				}
			}

			timeScale.setBaseIndex(lastSeriesBarIndex);
		}

		this.updateCrosshair();
		this.recalculateAllPanes();
		this.lightUpdate();
	}

	public recalculatePane(pane: Pane | null): void {
		if (pane !== null) {
			pane.recalculate();
		}
	}

	public paneForSource(source: IDataSource): Pane | null {
		const pane = this.#panes.find((p: Pane) => p.orderedSources().includes(source));
		return pane === undefined ? null : pane;
	}

	public recalculateAllPanes(): void {
		this.#panes.forEach((p: Pane) => p.recalculate());
		this.updateAllPaneViews();
	}

	public destroy(): void {
		this.#grid.destroy();
		this.#panes.forEach((p: Pane) => p.destroy());
		this.#panes.length = 0;

		// to avoid memleaks
		this.#options.localization.priceFormatter = undefined;
		this.#options.localization.timeFormatter = undefined;
	}

	public setPriceAutoScaleForAllMainSources(): void {
		this.#panes.map((p: Pane) => p.mainDataSource())
			.forEach((s: IPriceDataSource | null) => {
				if (s !== null) {
					const priceScale = ensureNotNull(s.priceScale());
					priceScale.setMode({
						autoScale: true,
					});
				}
			});
	}

	public rendererOptionsProvider(): PriceAxisRendererOptionsProvider {
		return this.#rendererOptionsProvider;
	}

	public priceAxisRendererOptions(): Readonly<PriceAxisViewRendererOptions> {
		return this.#rendererOptionsProvider.options();
	}

	public mainPriceScaleOptionsChanged(): ISubscription {
		return this.#mainPriceScaleOptionsChanged;
	}

	public mainPriceScale(): PriceScale {
		return this.#panes[0].defaultPriceScale();
	}

	public createSeries<T extends SeriesType>(seriesType: T, options: SeriesOptionsMap[T]): Series<T> {
		const pane = this.#panes[0];
		const series = this.#createSeries(options, seriesType, pane);
		this.#serieses.push(series);

		if (this.#serieses.length === 1) {
			// call fullUpdate to recalculate chart's parts geometry
			this.fullUpdate();
		} else {
			this.lightUpdate();
		}

		return series;
	}

	public removeSeries(series: Series): void {
		const pane = this.paneForSource(series);

		const seriesIndex = this.#serieses.indexOf(series);
		assert(seriesIndex !== -1, 'Series not found');

		this.#serieses.splice(seriesIndex, 1);
		ensureNotNull(pane).removeDataSource(series);
		if (series.destroy) {
			series.destroy();
		}
	}

	public fitContent(): void {
		const mask = new InvalidateMask(InvalidationLevel.Light);
		mask.setFitContent();
		this.#invalidate(mask);
	}

	public setTargetTimeRange(range: TimePointsRange): void {
		const mask = new InvalidateMask(InvalidationLevel.Light);
		mask.setTargetTimeRange(range);
		this.#invalidate(mask);
	}

	#paneInvalidationMask(pane: Pane | null, level: InvalidationLevel): InvalidateMask {
		const inv = new InvalidateMask(level);
		if (pane !== null) {
			const index = this.#panes.indexOf(pane);
			inv.invalidatePane(index, {
				level,
			});
		}
		return inv;
	}

	#invalidationMaskForSource(source: IDataSource, invalidateType?: InvalidationLevel): InvalidateMask {
		if (invalidateType === undefined) {
			invalidateType = InvalidationLevel.Light;
		}

		return this.#paneInvalidationMask(this.paneForSource(source), invalidateType);
	}

	#invalidate(mask: InvalidateMask): void {
		this.#invalidateHandler(mask);
	}

	#cursorUpdate(): void {
		this.#invalidate(new InvalidateMask(InvalidationLevel.Cursor));
	}

	#createSeries<T extends SeriesType>(options: SeriesOptionsMap[T], seriesType: T, pane: Pane): Series<T> {
		const series = new Series<T>(this, options, seriesType);

		pane.addDataSource(series, Boolean(options.overlay), false);

		if (options.overlay) {
			// let's apply that options again to apply margins
			series.applyOptions(options);
		}

		return series;
	}
}
