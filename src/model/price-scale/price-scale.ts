import type { IPriceFormatter } from '../../formatters/iformatter';
import { PercentageFormatter } from '../../formatters/percentage-formatter';
import { PriceFormatter } from '../../formatters/price-formatter';

import { ensureDefined, ensureNotNull } from '../../helpers/assertions';
import { Delegate } from '../../helpers/delegate';
import type { ISubscription } from '../../helpers/isubscription';
import { type DeepPartial, merge } from '../../helpers/strict-type-checks';

import type { BarCoordinates, BarPrice, BarPrices } from '../bar';
import { BarsRange } from '../bars-range';
import type { Coordinate } from '../coordinate';
import type { IDataSource } from '../data-source/idata-source';
import type { FirstValue, IPriceDataSource } from '../data-source/iprice-data-source';
import type { LayoutOptions } from '../layout-options';
import type { LocalizationOptions } from '../localization-options';
import { PriceDataSource } from '../data-source/price-data-source';
import { PriceRange } from '../price-range';
import {
	canConvertPriceRangeFromLog,
	convertPriceRangeFromLog,
	convertPriceRangeToLog,
	fromIndexedTo100,
	fromLog,
	fromPercent,
	toIndexedTo100,
	toIndexedTo100Range,
	toLog,
	toPercent,
	toPercentRange,
} from './price-scale-conversions';
import { PriceTickMarkBuilder } from './price-tick-mark-builder';
import { Series } from '../series';
import { sortSources } from '../data-source/sort-sources';
import type { SeriesItemsIndexesRange } from '../time-scale/time-data';

/**
 * Enum of possible price scale modes
 * Normal mode displays original price values
 * Logarithmic mode makes price scale show logarithms of series values instead of original values
 * Percentage turns the percentage mode on.
 * IndexedTo100 turns the "indexed to 100" mode on
 */
export const enum PriceScaleMode {
	Normal,
	Logarithmic,
	Percentage,
	IndexedTo100,
}

export interface PriceScaleState {
	autoScale: boolean;
	isInverted: boolean;
	mode: PriceScaleMode;
}

export interface PriceMark {
	coord: Coordinate;
	label: string;
}

export interface PricedValue {
	price: BarPrice;
	y: Coordinate;
}

/** Defines margins of the price scale */
export interface PriceScaleMargins {
	/** Top margin in percentages. Must be greater or equal to 0 and less than 100 */
	top: number;
	/** Bottom margin in percentages. Must be greater or equal to 0 and less than 100 */
	bottom: number;
}

export type PriceAxisPosition = 'left' | 'right' | 'none';

/** Structure that describes price scale options */
export interface PriceScaleOptions {
	/** True makes chart calculate the price range automatically based on the visible data range */
	autoScale: boolean;
	/** Mode of the price scale */
	mode: PriceScaleMode;
	/** True inverts the scale. Makes larger values drawn lower. Affects both the price scale and the data on the chart */
	invertScale: boolean;
	/** True value prevents labels on the price scale from overlapping one another by aligning them one below others */
	alignLabels: boolean;
	/** Defines position of the price scale on the chart */
	position: PriceAxisPosition;
	/** Defines price margins for the price scale */
	scaleMargins: PriceScaleMargins;
	/** Set true to draw a border between the price scale and the chart area */
	borderVisible: boolean;
	/** Defines a color of the border between the price scale and the chart area. It is ignored if borderVisible is false */
	borderColor: string;
	/** Indicates whether the price scale displays only full lines of text or partial lines. */
	entireTextOnly: boolean;
}

interface RangeCache {
	isValid: boolean;
	visibleBars: BarsRange | null;
}

// actually price should be BarPrice
type PriceTransformer = (price: BarPrice, baseValue: number) => number;

const percentageFormatter = new PercentageFormatter();
const defaultPriceFormatter = new PriceFormatter(100, 1);

export class PriceScale {
	readonly #layoutOptions: LayoutOptions;
	readonly #localizationOptions: LocalizationOptions;
	readonly #options: PriceScaleOptions;

	#height: number = 0;
	#internalHeightCache: number | null = null;
	#internalHeightChanged: Delegate = new Delegate();

	#priceRange: PriceRange | null = null;
	#priceRangeSnapshot: PriceRange | null = null;
	#priceRangeChanged: Delegate<PriceRange | null, PriceRange | null> = new Delegate();
	#invalidatedForRange: RangeCache = { isValid: false, visibleBars: null };

	#marginAbove: number = 0;
	#marginBelow: number = 0;

	#markBuilder: PriceTickMarkBuilder;
	#onMarksChanged: Delegate = new Delegate();

	#modeChanged: Delegate<PriceScaleState, PriceScaleState> = new Delegate();

	#dataSources: IDataSource[] = [];
	#cachedOrderedSources: IDataSource[] | null = null;
	#hasSeries: boolean = false;
	#mainSource: IPriceDataSource | null = null;

	#marksCache: PriceMark[] | null = null;

	#scaleStartPoint: number | null = null;
	#scrollStartPoint: number | null = null;
	#formatter: IPriceFormatter = defaultPriceFormatter;
	readonly #optionsChanged: Delegate = new Delegate();

	public constructor(options: PriceScaleOptions, layoutOptions: LayoutOptions, localizationOptions: LocalizationOptions) {
		this.#options = options;
		this.#layoutOptions = layoutOptions;
		this.#localizationOptions = localizationOptions;
		this.#markBuilder = new PriceTickMarkBuilder(this, 100, this.#coordinateToLogical.bind(this), this.#logicalToCoordinate.bind(this));
	}

	public options(): Readonly<PriceScaleOptions> {
		return this.#options;
	}

	public applyOptions(options: DeepPartial<PriceScaleOptions>): void {
		merge(this.#options, options);
		this.updateFormatter();

		if (options.mode !== undefined) {
			this.setMode({ mode: options.mode });
		}

		this.#optionsChanged.fire();

		if (options.scaleMargins !== undefined) {
			const top = ensureDefined(options.scaleMargins.top);
			const bottom = ensureDefined(options.scaleMargins.bottom);

			if (top < 0 || top > 1) {
				throw new Error(`Invalid top margin - expect value between 0 and 1, given=${top}`);
			}

			if (bottom < 0 || bottom > 1 || top + bottom > 1) {
				throw new Error(`Invalid bottom margin - expect value between 0 and 1, given=${bottom}`);
			}

			if (top + bottom > 1) {
				throw new Error(`Invalid margins - sum of margins must be less than 1, given=${top + bottom}`);
			}

			this.#invalidateInternalHeightCache();
			this.#marksCache = null;
		}
	}

	public optionsChanged(): ISubscription {
		return this.#optionsChanged;
	}

	public isAutoScale(): boolean {
		return this.#options.autoScale;
	}

	public isLog(): boolean {
		return this.#options.mode === PriceScaleMode.Logarithmic;
	}

	public isPercentage(): boolean {
		return this.#options.mode === PriceScaleMode.Percentage;
	}

	public isIndexedTo100(): boolean {
		return this.#options.mode === PriceScaleMode.IndexedTo100;
	}

	public mode(): PriceScaleState {
		return {
			autoScale: this.#options.autoScale,
			isInverted: this.#options.invertScale,
			mode: this.#options.mode,
		};
	}

	public setMode(newMode: Partial<PriceScaleState>): void {
		const oldMode = this.mode();
		let priceRange: PriceRange | null = null;

		if (newMode.autoScale !== undefined) {
			this.#options.autoScale = newMode.autoScale;
		}

		if (newMode.mode !== undefined) {
			this.#options.mode = newMode.mode;
			if (newMode.mode === PriceScaleMode.Percentage || newMode.mode === PriceScaleMode.IndexedTo100) {
				this.#options.autoScale = true;
			}
			// TODO: Remove after making rebuildTickMarks lazy
			this.#invalidatedForRange.isValid = false;
		}

		// define which scale converted from
		if (oldMode.mode === PriceScaleMode.Logarithmic && newMode.mode !== oldMode.mode) {
			if (canConvertPriceRangeFromLog(this.#priceRange)) {
				priceRange = convertPriceRangeFromLog(this.#priceRange);

				if (priceRange !== null) {
					this.setPriceRange(priceRange);
				}
			} else {
				this.#options.autoScale = true;
			}
		}

		// define which scale converted to
		if (newMode.mode === PriceScaleMode.Logarithmic && newMode.mode !== oldMode.mode) {
			priceRange = convertPriceRangeToLog(this.#priceRange);

			if (priceRange !== null) {
				this.setPriceRange(priceRange);
			}
		}

		const modeChanged = oldMode.mode !== this.#options.mode;
		if (modeChanged && (oldMode.mode === PriceScaleMode.Percentage || this.isPercentage())) {
			this.updateFormatter();
		}

		if (modeChanged && (oldMode.mode === PriceScaleMode.IndexedTo100 || this.isIndexedTo100())) {
			this.updateFormatter();
		}

		if (newMode.isInverted !== undefined && oldMode.isInverted !== newMode.isInverted) {
			this.#options.invertScale = newMode.isInverted;
			this.#onIsInvertedChanged();
		}

		this.#modeChanged.fire(oldMode, this.mode());
	}

	public modeChanged(): ISubscription<PriceScaleState, PriceScaleState> {
		return this.#modeChanged;
	}

	public fontSize(): number {
		return this.#layoutOptions.fontSize;
	}

	public height(): number {
		return this.#height;
	}

	public setHeight(value: number): void {
		if (this.#height === value) {
			return;
		}

		this.#height = value;
		this.#invalidateInternalHeightCache();
		this.#marksCache = null;
	}

	public internalHeight(): number {
		if (this.#internalHeightCache) {
			return this.#internalHeightCache;
		}

		const res = this.height() - this.#topMarginPx() - this.#bottomMarginPx();
		this.#internalHeightCache = res;
		return res;
	}

	public internalHeightChanged(): ISubscription {
		return this.#internalHeightChanged;
	}

	public priceRange(): PriceRange | null {
		this.#makeSureItIsValid();
		return this.#priceRange;
	}

	public priceRangeChanged(): ISubscription<PriceRange | null, PriceRange | null> {
		return this.#priceRangeChanged;
	}

	public setPriceRange(newPriceRange: PriceRange | null, isForceSetValue?: boolean, onlyPriceScaleUpdate?: boolean): void {
		const oldPriceRange = this.#priceRange;

		if (!isForceSetValue &&
			!(oldPriceRange === null && newPriceRange !== null) &&
			(oldPriceRange === null || oldPriceRange.equals(newPriceRange))) {
			return;
		}

		this.#marksCache = null;
		this.#priceRange = newPriceRange;

		if (!onlyPriceScaleUpdate) {
			this.#priceRangeChanged.fire(oldPriceRange, newPriceRange);
		}
	}

	public isEmpty(): boolean {
		this.#makeSureItIsValid();
		return this.#height === 0 || !this.#priceRange || this.#priceRange.isEmpty();
	}

	public invertedCoordinate(coordinate: number): number {
		return this.isInverted() ? coordinate : this.height() - 1 - coordinate;
	}

	public priceToCoordinate(price: number, baseValue: number): Coordinate {
		if (this.isPercentage()) {
			price = toPercent(price, baseValue);
		} else if (this.isIndexedTo100()) {
			price = toIndexedTo100(price, baseValue);
		}

		return this.#logicalToCoordinate(price, baseValue);
	}

	public pointsArrayToCoordinates<T extends PricedValue>(points: T[], baseValue: number, visibleRange?: SeriesItemsIndexesRange): void {
		this.#makeSureItIsValid();
		const bh = this.#bottomMarginPx();
		const range = ensureNotNull(this.priceRange());
		const min = range.minValue();
		const max = range.maxValue();
		const ih = (this.internalHeight() - 1);
		const isInverted = this.isInverted();

		const hmm = ih / (max - min);

		const fromIndex = (visibleRange === undefined) ? 0 : visibleRange.from;
		const toIndex = (visibleRange === undefined) ? points.length : visibleRange.to;

		const transformFn = this.#getCoordinateTransformer();
		for (let i = fromIndex; i < toIndex; i++) {
			const point = points[i];
			const price = point.price;

			if (isNaN(price)) {
				continue;
			}

			let logical = price;
			if (transformFn !== null) {
				logical = transformFn(point.price, baseValue) as BarPrice;
			}

			const invCoordinate = bh + hmm * (logical - min);
			const coordinate = isInverted ? invCoordinate : this.#height - 1 - invCoordinate;
			point.y = coordinate as Coordinate;
		}
	}

	public barPricesToCoordinates<T extends BarPrices & BarCoordinates>(pricesList: T[], baseValue: number, visibleRange?: SeriesItemsIndexesRange): void {
		this.#makeSureItIsValid();
		const bh = this.#bottomMarginPx();
		const range = ensureNotNull(this.priceRange());
		const min = range.minValue();
		const max = range.maxValue();
		const ih = (this.internalHeight() - 1);
		const isInverted = this.isInverted();

		const hmm = ih / (max - min);

		const fromIndex = (visibleRange === undefined) ? 0 : visibleRange.from;
		const toIndex = (visibleRange === undefined) ? pricesList.length : visibleRange.to;

		const transformFn = this.#getCoordinateTransformer();
		for (let i = fromIndex; i < toIndex; i++) {
			const bar = pricesList[i];

			let openLogical = bar.open;
			let highLogical = bar.high;
			let lowLogical = bar.low;
			let closeLogical = bar.close;

			if (transformFn !== null) {
				openLogical = transformFn(bar.open, baseValue) as BarPrice;
				highLogical = transformFn(bar.high, baseValue) as BarPrice;
				lowLogical = transformFn(bar.low, baseValue) as BarPrice;
				closeLogical = transformFn(bar.close, baseValue) as BarPrice;
			}

			let invCoordinate = bh + hmm * (openLogical - min);
			let coordinate = isInverted ? invCoordinate : this.#height - 1 - invCoordinate;
			bar.openY = coordinate as Coordinate;

			invCoordinate = bh + hmm * (highLogical - min);
			coordinate = isInverted ? invCoordinate : this.#height - 1 - invCoordinate;
			bar.highY = coordinate as Coordinate;

			invCoordinate = bh + hmm * (lowLogical - min);
			coordinate = isInverted ? invCoordinate : this.#height - 1 - invCoordinate;
			bar.lowY = coordinate as Coordinate;

			invCoordinate = bh + hmm * (closeLogical - min);
			coordinate = isInverted ? invCoordinate : this.#height - 1 - invCoordinate;
			bar.closeY = coordinate as Coordinate;
		}
	}

	public coordinateToPrice(coordinate: Coordinate, baseValue: number): BarPrice {
		const logical = this.#coordinateToLogical(coordinate, baseValue);
		return this.logicalToPrice(logical, baseValue);
	}

	public logicalToPrice(logical: number, baseValue: number): BarPrice {
		let value = logical;
		if (this.isPercentage()) {
			value = fromPercent(value, baseValue);
		} else if (this.isIndexedTo100()) {
			value = fromIndexedTo100(value, baseValue);
		}
		return value as BarPrice;
	}

	public dataSources(): ReadonlyArray<IDataSource> {
		return this.#dataSources;
	}

	public orderedSources(): ReadonlyArray<IDataSource> {
		if (this.#cachedOrderedSources) {
			return this.#cachedOrderedSources;
		}

		let sources: IDataSource[] = [];
		for (let i = 0; i < this.#dataSources.length; i++) {
			const ds = this.#dataSources[i];
			if (ds.zorder() === null) {
				ds.setZorder(i + 1);
			}

			sources.push(ds);
		}

		sources = sortSources(sources);
		this.#cachedOrderedSources = sources;
		return this.#cachedOrderedSources;
	}

	public hasSeries(): boolean {
		return this.#hasSeries;
	}

	public addDataSource(source: IDataSource): void {
		if (this.#dataSources.indexOf(source) !== -1) {
			return;
		}

		if ((source instanceof Series)) {
			this.#hasSeries = true;
		}

		this.#dataSources.push(source);
		this.#mainSource = null;
		this.updateFormatter();
		this.invalidateSourcesCache();
	}

	public removeDataSource(source: IDataSource): void {
		const index = this.#dataSources.indexOf(source);
		if (index === -1) {
			throw new Error('source is not attached to scale');
		}

		this.#dataSources.splice(index, 1);
		if (source instanceof Series) {
			this.#hasSeries = false;
		}

		if (!this.mainSource()) {
			this.setMode({
				autoScale: true,
			});
		}

		this.#mainSource = null;
		this.updateFormatter();
		this.invalidateSourcesCache();
	}

	public mainSource(): IPriceDataSource | null {
		if (this.#mainSource !== null) {
			return this.#mainSource;
		}

		let priceSource: IPriceDataSource | null = null;

		for (let i = 0; i < this.#dataSources.length; i++) {
			const source = this.#dataSources[i];
			if (source instanceof Series) {
				priceSource = source;
				break;
			}

			if ((priceSource === null) && (source instanceof PriceDataSource)) {
				priceSource = source;
			}
		}

		this.#mainSource = priceSource;
		return this.#mainSource;
	}

	public firstValue(): number | null {
		// TODO: cache the result
		let result: FirstValue | null = null;

		for (const source of this.#dataSources) {
			if (source instanceof PriceDataSource) {
				const firstValue = source.firstValue();
				if (firstValue === null) {
					continue;
				}

				if (result === null || firstValue.timePoint < result.timePoint) {
					result = firstValue;
				}
			}
		}

		return result === null ? null : result.value;
	}

	public isInverted(): boolean {
		return this.#options.invertScale;
	}

	public marks(): PriceMark[] {
		if (this.#marksCache) {
			return this.#marksCache;
		}

		this.#markBuilder.rebuildTickMarks();
		this.#marksCache = this.#markBuilder.marks();
		this.#onMarksChanged.fire();

		return this.#marksCache;
	}

	public onMarksChanged(): ISubscription {
		return this.#onMarksChanged;
	}

	public startScale(x: number): void {
		if (this.isPercentage() || this.isIndexedTo100()) {
			return;
		}

		if (this.#scaleStartPoint !== null || this.#priceRangeSnapshot !== null) {
			return;
		}

		if (this.isEmpty()) {
			return;
		}

		// invert x
		this.#scaleStartPoint = this.#height - x;
		this.#priceRangeSnapshot = ensureNotNull(this.priceRange()).clone();
	}

	public scaleTo(x: number): void {
		if (this.isPercentage() || this.isIndexedTo100()) {
			return;
		}

		if (this.#scaleStartPoint === null) {
			return;
		}

		this.setMode({
			autoScale: false,
		});

		// invert x
		x = this.#height - x;

		if (x < 0) {
			x = 0;
		}

		let scaleCoeff = (this.#scaleStartPoint + (this.#height - 1) * 0.2) / (x + (this.#height - 1) * 0.2);
		const newPriceRange = ensureNotNull(this.#priceRangeSnapshot).clone();

		scaleCoeff = Math.max(scaleCoeff, 0.1);
		newPriceRange.scaleAroundCenter(scaleCoeff);
		this.setPriceRange(newPriceRange);
	}

	public endScale(): void {
		if (this.isPercentage() || this.isIndexedTo100()) {
			return;
		}

		this.#scaleStartPoint = null;
		this.#priceRangeSnapshot = null;
	}

	public startScroll(x: number): void {
		if (this.isAutoScale()) {
			return;
		}

		if (this.#scrollStartPoint !== null || this.#priceRangeSnapshot !== null) {
			return;
		}

		if (this.isEmpty()) {
			return;
		}

		this.#scrollStartPoint = x;
		this.#priceRangeSnapshot = ensureNotNull(this.priceRange()).clone();
	}

	public scrollTo(x: number): void {
		if (this.isAutoScale()) {
			return;
		}

		if (this.#scrollStartPoint === null) {
			return;
		}

		const priceUnitsPerPixel = ensureNotNull(this.priceRange()).length() / (this.internalHeight() - 1);
		let pixelDelta = x - this.#scrollStartPoint;

		if (this.isInverted()) {
			pixelDelta *= -1;
		}

		const priceDelta = pixelDelta * priceUnitsPerPixel;
		const newPriceRange = ensureNotNull(this.#priceRangeSnapshot).clone();

		newPriceRange.shift(priceDelta);
		this.setPriceRange(newPriceRange, true);
		this.#marksCache = null;
	}

	public endScroll(): void {
		if (this.isAutoScale()) {
			return;
		}

		if (this.#scrollStartPoint === null) {
			return;
		}

		this.#scrollStartPoint = null;
		this.#priceRangeSnapshot = null;
	}

	public formatter(): IPriceFormatter {
		if (!this.#formatter) {
			this.updateFormatter();
		}

		return this.#formatter;
	}

	public formatPrice(price: number, firstValue: number): string {
		switch (this.#options.mode) {
			case PriceScaleMode.Percentage:
				return this.formatter().format(toPercent(price, firstValue));
			case PriceScaleMode.IndexedTo100:
				return this.formatter().format(toIndexedTo100(price, firstValue));
			default:
				return this.#formatPrice(price as BarPrice);
		}
	}

	public formatLogical(logical: number): string {
		switch (this.#options.mode) {
			case PriceScaleMode.Percentage:
			case PriceScaleMode.IndexedTo100:
				return this.formatter().format(logical);
			default:
				return this.#formatPrice(logical as BarPrice);
		}
	}

	public formatPriceAbsolute(price: number): string {
		return this.#formatPrice(price as BarPrice, this.#mainSourceFormatter());
	}

	public formatPricePercentage(price: number, baseValue: number): string {
		price = toPercent(price, baseValue);
		return percentageFormatter.format(price);
	}

	public sourcesForAutoScale(): ReadonlyArray<IPriceDataSource> {
		function useSourceForAutoScale(source: IDataSource): source is IPriceDataSource {
			return source instanceof PriceDataSource;
		}

		return this.#dataSources.filter(useSourceForAutoScale);
	}

	public recalculatePriceRange(visibleBars: BarsRange): void {
		this.#invalidatedForRange = {
			visibleBars: visibleBars,
			isValid: false,
		};
	}

	public updateAllViews(): void {
		this.#dataSources.forEach((s: IDataSource) => s.updateAllViews());
	}

	public updateFormatter(): void {
		this.#marksCache = null;
		const mainSource = this.mainSource();
		let base = 100;
		if (mainSource !== null) {
			base = Math.round(1 / mainSource.minMove());
		}

		this.#formatter = defaultPriceFormatter;
		if (this.isPercentage()) {
			this.#formatter = percentageFormatter;
			base = 100;
		} else if (this.isIndexedTo100()) {
			this.#formatter = new PriceFormatter(100, 1);
			base = 100;
		} else {
			if (mainSource !== null) {
				// user
				this.#formatter = mainSource.formatter();
			}
		}

		this.#markBuilder = new PriceTickMarkBuilder(
			this,
			base,
			this.#coordinateToLogical.bind(this),
			this.#logicalToCoordinate.bind(this)
		);

		this.#markBuilder.rebuildTickMarks();
	}

	public invalidateSourcesCache(): void {
		this.#cachedOrderedSources = null;
	}

	#topMarginPx(): number {
		return this.isInverted()
			? this.#options.scaleMargins.bottom * this.height() + this.#marginBelow
			: this.#options.scaleMargins.top * this.height() + this.#marginAbove;
	}

	#bottomMarginPx(): number {
		return this.isInverted()
			? this.#options.scaleMargins.top * this.height() + this.#marginAbove
			: this.#options.scaleMargins.bottom * this.height() + this.#marginBelow;
	}

	#makeSureItIsValid(): void {
		if (!this.#invalidatedForRange.isValid) {
			this.#invalidatedForRange.isValid = true;
			this.#recalculatePriceRangeImpl();
		}
	}

	#invalidateInternalHeightCache(): void {
		this.#internalHeightCache = null;
		this.#internalHeightChanged.fire();
	}

	#logicalToCoordinate(logical: number, baseValue: number): Coordinate {
		this.#makeSureItIsValid();
		if (this.isEmpty()) {
			return 0 as Coordinate;
		}

		logical = this.isLog() && logical ? toLog(logical) : logical;
		const range = ensureNotNull(this.priceRange());
		const invCoordinate = this.#bottomMarginPx() +
			(this.internalHeight() - 1) * (logical - range.minValue()) / range.length();
		const coordinate = this.invertedCoordinate(invCoordinate);
		return coordinate as Coordinate;
	}

	#coordinateToLogical(coordinate: number, baseValue: number): number {
		this.#makeSureItIsValid();
		if (this.isEmpty()) {
			return 0;
		}

		const invCoordinate = this.invertedCoordinate(coordinate);
		const range = ensureNotNull(this.priceRange());
		const logical = range.minValue() + range.length() *
			((invCoordinate - this.#bottomMarginPx()) / (this.internalHeight() - 1));
		return this.isLog() ? fromLog(logical) : logical;
	}

	#onIsInvertedChanged(): void {
		this.#marksCache = null;
		this.#markBuilder.rebuildTickMarks();
	}

	#mainSourceFormatter(): IPriceFormatter {
		const mainSource = ensureNotNull(this.mainSource());
		return mainSource.formatter();
	}

	
	#recalculatePriceRangeImpl(): void {
		const visibleBars = this.#invalidatedForRange.visibleBars;
		if (visibleBars === null) {
			return;
		}

		let priceRange: PriceRange | null = null;
		const sources = this.sourcesForAutoScale();

		let marginAbove = 0;
		let marginBelow = 0;

		for (const source of sources) {
			const firstValue = source.firstValue();
			if (firstValue === null) {
				continue;
			}

			const autoScaleInfo = source.autoscaleInfo(visibleBars.firstBar(), visibleBars.lastBar());
			let sourceRange = autoScaleInfo && autoScaleInfo.priceRange;

			if (sourceRange !== null) {
				switch (this.#options.mode) {
					case PriceScaleMode.Logarithmic:
						sourceRange = convertPriceRangeToLog(sourceRange);
						break;
					case PriceScaleMode.Percentage:
						sourceRange = toPercentRange(sourceRange, firstValue.value);
						break;
					case PriceScaleMode.IndexedTo100:
						sourceRange = toIndexedTo100Range(sourceRange, firstValue.value);
						break;
				}

				if (priceRange === null) {
					priceRange = sourceRange;
				} else {
					priceRange = priceRange.merge(ensureNotNull(sourceRange));
				}

				if (autoScaleInfo !== null && autoScaleInfo.margins !== null) {
					marginAbove = Math.max(marginAbove, autoScaleInfo.margins.above);
					marginBelow = Math.max(marginAbove, autoScaleInfo.margins.below);
				}
			}
		}

		if (marginAbove !== this.#marginAbove || marginBelow !== this.#marginBelow) {
			this.#marginAbove = marginAbove;
			this.#marginBelow = marginBelow;
			this.#marksCache = null;
			this.#invalidateInternalHeightCache();
		}

		if (priceRange !== null) {
			// keep current range is new is empty
			if (priceRange.minValue() === priceRange.maxValue()) {
				const mainSource = this.mainSource();
				const minMove = mainSource === null || this.isPercentage() || this.isIndexedTo100() ? 1 : mainSource.minMove();

				// if price range is degenerated to 1 point let's extend it by 10 min move values
				// to avoid incorrect range and empty (blank) scale (in case of min tick much greater than 1)
				const extendValue = 5 * minMove;
				priceRange = new PriceRange(priceRange.minValue() - extendValue, priceRange.maxValue() + extendValue);
			}

			this.setPriceRange(priceRange);
		} else {
			// reset empty to default
			if (this.#priceRange === null) {
				this.setPriceRange(new PriceRange(-0.5, 0.5));
			}
		}

		this.#invalidatedForRange.isValid = true;
	}

	#getCoordinateTransformer(): PriceTransformer | null {
		if (this.isPercentage()) {
			return toPercent;
		} else if (this.isIndexedTo100()) {
			return toIndexedTo100;
		} else if (this.isLog()) {
			return toLog;
		}

		return null;
	}

	#formatPrice(price: BarPrice, fallbackFormatter?: IPriceFormatter): string {
		if (this.#localizationOptions.priceFormatter === undefined) {
			if (fallbackFormatter === undefined) {
				fallbackFormatter = this.formatter();
			}

			return fallbackFormatter.format(price);
		}

		return this.#localizationOptions.priceFormatter(price);
	}
}
