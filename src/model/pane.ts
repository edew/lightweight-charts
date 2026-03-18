import { assert, ensureNotNull } from '../helpers/assertions';
import { Delegate } from '../helpers/delegate';
import type { IDestroyable } from '../helpers/idestroyable';
import type { ISubscription } from '../helpers/isubscription';
import { clone } from '../helpers/strict-type-checks';

import { ChartModel } from './chart-model';
import type { IDataSource } from './data-source/idata-source';
import type { IPriceDataSource } from './data-source/iprice-data-source';
import { PriceDataSource } from './data-source/price-data-source';
import { PriceScale, PriceScaleMode, type PriceScaleState } from './price-scale/price-scale';
import { Series } from './series';
import { sortSources } from './data-source/sort-sources';
import { TimeScale } from './time-scale/time-scale';

export const DEFAULT_STRETCH_FACTOR = 1000;

export type PriceScalePosition = 'left' | 'right' | 'overlay';

export type PreferredPriceScalePosition = 'left' | 'right' | 'overlay';

interface MinMaxOrderInfo {
	minZOrder: number;
	maxZOrder: number;
}

export class Pane implements IDestroyable {
	readonly #timeScale: TimeScale;
	readonly #model: ChartModel;

	readonly #defaultNonOverlayPriceScale: PriceScale;
	#dataSources: IDataSource[] = [];
	#overlaySources: IDataSource[] = [];

	#height: number = 0;
	#width: number = 0;
	#stretchFactor: number = DEFAULT_STRETCH_FACTOR;
	#mainDataSource: IPriceDataSource | null = null;
	#cachedOrderedSources: ReadonlyArray<IDataSource> | null = null;

	#destroyed: Delegate = new Delegate();

	public constructor(timeScale: TimeScale, model: ChartModel) {
		this.#timeScale = timeScale;
		this.#model = model;

		this.model().mainPriceScaleOptionsChanged().subscribe(this.onPriceScaleOptionsChanged.bind(this), this);
		this.#defaultNonOverlayPriceScale = this.#createPriceScale();
	}

	public onPriceScaleOptionsChanged(): void {
		this.#defaultNonOverlayPriceScale.applyOptions(this.#model.options().priceScale);
	}

	public destroy(): void {
		this.model().mainPriceScaleOptionsChanged().unsubscribeAll(this);

		this.#defaultNonOverlayPriceScale.modeChanged().unsubscribeAll(this);

		this.#dataSources.forEach((source: IDataSource) => {
			if (source.destroy) {
				source.destroy();
			}
		});
		this.#destroyed.fire();
		this.#destroyed.destroy();
	}

	public stretchFactor(): number {
		return this.#stretchFactor;
	}

	public setStretchFactor(factor: number): void {
		this.#stretchFactor = factor;
	}

	public model(): ChartModel {
		return this.#model;
	}

	public width(): number {
		return this.#width;
	}

	public height(): number {
		return this.#height;
	}

	public setWidth(width: number): void {
		this.#width = width;
		this.updateAllViews();
	}

	public setHeight(height: number): void {
		this.#height = height;
		this.#defaultNonOverlayPriceScale.setHeight(height);

		// process overlays
		this.#dataSources.forEach((ds: IDataSource) => {
			if (this.isOverlay(ds)) {
				const priceScale = ds.priceScale();
				if (priceScale !== null) {
					priceScale.setHeight(height);
				}
			}
		});

		this.updateAllViews();
	}

	public dataSources(): ReadonlyArray<IDataSource> {
		return this.#dataSources;
	}

	public isOverlay(source: IDataSource): boolean {
		const priceScale = source.priceScale();
		if (priceScale === null) {
			return true;
		}
		return this.#defaultNonOverlayPriceScale !== priceScale;
	}

	public addDataSource(source: IDataSource, overlay: boolean, keepZorder: boolean): void {
		const zOrder = this.#getZOrderMinMax().minZOrder - 1;
		this.#insertDataSource(source, overlay, zOrder);
	}

	public removeDataSource(source: IDataSource): void {
		const index = this.#dataSources.indexOf(source);
		assert(index !== -1, 'removeDataSource: invalid data source');

		this.#dataSources.splice(index, 1);
		if (source === this.#mainDataSource) {
			this.#mainDataSource = null;
		}

		const overlayIndex = this.#overlaySources.indexOf(source);
		if (overlayIndex !== -1) {
			this.#overlaySources.splice(overlayIndex, 1);
		}

		const priceScale = source.priceScale();
		// if source has owner, it returns owner's price scale
		// and it does not have source in their list
		if (priceScale && priceScale.dataSources().indexOf(source) >= 0) {
			priceScale.removeDataSource(source);
		}

		if (priceScale && priceScale.mainSource() === null) {
			const dataSourceCount = priceScale.dataSources().length;
			assert(dataSourceCount === 0, 'Invalid priceScale state: empty mainSource but non-empty data sources=' + dataSourceCount);

			if (priceScale !== this.#defaultNonOverlayPriceScale) {
				priceScale.modeChanged().unsubscribeAll(this);
			}
		}

		if (source instanceof PriceDataSource) {
			this.#processMainSourceChange();
		}

		if (priceScale && source instanceof PriceDataSource) {
			priceScale.invalidateSourcesCache();
			this.recalculatePriceScale(priceScale);
		}

		this.#cachedOrderedSources = null;
	}

	public priceScalePosition(): PriceScalePosition {
		const position = this.#model.options().priceScale.position;
		return position === 'none' ? 'overlay' : position;
	}

	public startScalePrice(priceScale: PriceScale, x: number): void {
		priceScale.startScale(x);
	}

	public scalePriceTo(priceScale: PriceScale, x: number): void {
		priceScale.scaleTo(x);

		// TODO: be more smart and update only affected views
		this.updateAllViews();
	}

	public endScalePrice(priceScale: PriceScale): void {
		priceScale.endScale();
	}

	public startScrollPrice(priceScale: PriceScale, x: number): void {
		priceScale.startScroll(x);
	}

	public scrollPriceTo(priceScale: PriceScale, x: number): void {
		priceScale.scrollTo(x);
		this.updateAllViews();
	}

	public endScrollPrice(priceScale: PriceScale): void {
		priceScale.endScroll();
	}

	public setPriceAutoScale(priceScale: PriceScale, autoScale: boolean): void {
		priceScale.setMode({
			autoScale: autoScale,
		});

		if (this.#timeScale.isEmpty()) {
			priceScale.setPriceRange(null);
			return;
		}

		this.recalculatePriceScale(priceScale);
	}

	public updateAllViews(): void {
		this.#dataSources.forEach((source: IDataSource) => {
			source.updateAllViews();
		});
	}

	public defaultPriceScale(): PriceScale {
		const mainDataSource = this.mainDataSource();
		let res = mainDataSource !== null ? mainDataSource.priceScale() : null;

		// Every Pane MUST have a price scale! This is mostly a fix of broken charts with empty panes...
		if (res === null) {
			res = this.#defaultNonOverlayPriceScale;
		}

		return res;
	}

	public mainDataSource(): IPriceDataSource | null {
		return this.#mainDataSource;
	}

	public recalculatePriceScale(priceScale: PriceScale | null): void {
		if (priceScale === null || !priceScale.isAutoScale()) {
			return;
		}

		this.#recalculatePriceScaleImpl(priceScale);
	}

	public resetPriceScale(priceScale: PriceScale): void {
		const visibleBars = this.#timeScale.visibleBars();
		priceScale.setMode({ autoScale: true });
		if (visibleBars !== null) {
			priceScale.recalculatePriceRange(visibleBars);
		}
		this.updateAllViews();
	}

	public momentaryAutoScale(): void {
		this.#recalculatePriceScaleImpl(this.#defaultNonOverlayPriceScale);
	}

	public recalculate(): void {
		this.recalculatePriceScale(this.#defaultNonOverlayPriceScale);

		this.#dataSources.forEach((ds: IDataSource) => {
			if (this.isOverlay(ds)) {
				this.recalculatePriceScale(ds.priceScale());
			}
		});

		this.updateAllViews();
		this.#model.lightUpdate();
	}

	public isEmpty(): boolean {
		return this.#mainDataSource === null;
	}

	public containsSeries(): boolean {
		return this.#dataSources.some((ds: IDataSource) => ds instanceof Series);
	}

	public orderedSources(): ReadonlyArray<IDataSource> {
		if (this.#cachedOrderedSources === null) {
			this.#cachedOrderedSources = sortSources(this.#dataSources);
		}

		return this.#cachedOrderedSources;
	}

	public onDestroyed(): ISubscription {
		return this.#destroyed;
	}

	#findSuitableScale(source: IPriceDataSource, preferredScale: PreferredPriceScalePosition): PriceScale {
		if (preferredScale !== 'overlay') {
			return this.#defaultNonOverlayPriceScale;
		}

		return this.#createPriceScale(true);
	}

	#recalculatePriceScaleImpl(priceScale: PriceScale): void {
		// TODO: can use this checks
		const sourceForAutoScale = priceScale.sourcesForAutoScale();

		if (sourceForAutoScale && sourceForAutoScale.length > 0 && !this.#timeScale.isEmpty()) {
			const visibleBars = this.#timeScale.visibleBars();
			if (visibleBars !== null) {
				priceScale.recalculatePriceRange(visibleBars);
			}
		}

		priceScale.updateAllViews();
	}

	#getZOrderMinMax(): MinMaxOrderInfo {
		const sources = this.orderedSources();
		if (sources.length === 0) {
			return { minZOrder: 0, maxZOrder: 0 };
		}

		let minZOrder = 0;
		let maxZOrder = 0;
		for (let j = 0; j < sources.length; j++) {
			const ds = sources[j];
			const zOrder = ds.zorder();
			if (zOrder !== null) {
				if (zOrder < minZOrder) {
					minZOrder = zOrder;
				}

				if (zOrder > maxZOrder) {
					maxZOrder = zOrder;
				}
			}
		}

		return { minZOrder: minZOrder, maxZOrder: maxZOrder };
	}

	#insertDataSource(source: IDataSource, overlay: boolean, zOrder: number): void {
		let priceScalePosition: PreferredPriceScalePosition = 'overlay';
		let priceScale: PriceScale | null = null;
		if (!overlay) {
			const optionsPosition = this.model().options().priceScale.position;
			priceScalePosition = optionsPosition === 'none' ? 'overlay' : optionsPosition;
		}

		if (source instanceof PriceDataSource) {
			priceScale = this.#findSuitableScale(source, priceScalePosition);
		}

		this.#dataSources.push(source);
		if (overlay) {
			this.#overlaySources.push(source);
		}

		if (priceScale !== null) {
			priceScale.addDataSource(source);
			source.setPriceScale(priceScale);
		}

		source.setZorder(zOrder);
		this.#processMainSourceChange();

		if (source instanceof PriceDataSource) {
			this.recalculatePriceScale(priceScale);
		}

		this.#cachedOrderedSources = null;
	}

	#onPriceScaleModeChanged(priceScale: PriceScale, oldMode: PriceScaleState, newMode: PriceScaleState): void {
		if (oldMode.mode === newMode.mode) {
			return;
		}

		// momentary auto scale if we toggle percentage/indexedTo100 mode
		this.#recalculatePriceScaleImpl(priceScale);
	}

	#processMainSourceChange(): void {
		if (this.#mainDataSource === null || this.#overlaySources.indexOf(this.#mainDataSource) !== -1) {
			// first check non-overlay sources
			for (const source of this.#dataSources) {
				if (source instanceof PriceDataSource && !this.isOverlay(source)) {
					this.#setMainSource(source);
					return;
				}
			}
			// then check overlay sources
			for (const source of this.#overlaySources) {
				if (source instanceof PriceDataSource) {
					this.#setMainSource(source);
					return;
				}
			}
		}
	}

	#setMainSource(source: IPriceDataSource): void {
		const priceScale = ensureNotNull(source.priceScale());
		this.defaultPriceScale().modeChanged().unsubscribeAll(this);
		priceScale.modeChanged().subscribe(this.#onPriceScaleModeChanged.bind(this, priceScale), this);
		this.#mainDataSource = source;
	}

	#createPriceScale(overlay?: boolean): PriceScale {
		const priceScaleOptions = clone(this.#model.options().priceScale);

		if (overlay) {
			// overlay scales should be normal with auto scale enabled
			priceScaleOptions.autoScale = true;
			priceScaleOptions.mode = PriceScaleMode.Normal;
		}

		const priceScale = new PriceScale(
			priceScaleOptions,
			this.#model.options().layout,
			this.#model.options().localization
		);
		priceScale.setHeight(this.height());
		return priceScale;
	}
}
