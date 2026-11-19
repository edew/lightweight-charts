import { clone } from '../helpers/strict-type-checks';

import type { ChartModel } from './chart-model';
import { PriceScale, PriceScaleMode } from './price-scale/price-scale';
import type { Series } from './series';

/**
 * One horizontal part of the chart with its own price scale.
 * All panes share the time scale.
 */
export class Pane {
	/** Relative height of the pane. */
	public stretch: number = 1;
	/** The price scale that the price axis shows. */
	public readonly priceScale: PriceScale;
	/** The series of the pane, in the order in which they were added. The last one is drawn first. */
	public readonly series: Series[] = [];

	readonly #model: ChartModel;
	#height: number = 0;

	public constructor(model: ChartModel) {
		this.#model = model;
		this.priceScale = this.#createPriceScale(false);
	}

	public height(): number {
		return this.#height;
	}

	public setHeight(height: number): void {
		this.#height = height;
		this.priceScale.setHeight(height);
		for (const series of this.series) {
			series.priceScale().setHeight(height);
		}
	}

	/** An overlay series gets its own price scale, which has no axis. */
	public addSeries(series: Series, overlay: boolean): void {
		const priceScale = overlay ? this.#createPriceScale(true) : this.priceScale;
		priceScale.addSource(series);
		series.setPriceScale(priceScale);
		series.setPane(this);
		this.series.push(series);
		this.recalculate();
	}

	public removeSeries(series: Series): void {
		const index = this.series.indexOf(series);
		if (index !== -1) {
			this.series.splice(index, 1);
			series.priceScale().removeSource(series);
			this.recalculate();
		}
	}

	/** Marks the price range of each price scale with autoscale for a new calculation. */
	public recalculate(): void {
		this.#recalculatePriceScale(this.priceScale, false);
		for (const series of this.series) {
			if (series.priceScale() !== this.priceScale) {
				this.#recalculatePriceScale(series.priceScale(), false);
			}
		}
	}

	/** Fits the price range to the visible bars one time, also when autoscale is off. */
	public momentaryAutoScale(): void {
		this.#recalculatePriceScale(this.priceScale, true);
	}

	#recalculatePriceScale(priceScale: PriceScale, force: boolean): void {
		// a scale with no range gets one autoscale, also when the autoscale option is off
		if (!force && !priceScale.isAutoScale() && priceScale.priceRange() !== null) {
			return;
		}

		const timeScale = this.#model.timeScale();
		if (priceScale.sources().length === 0 || timeScale.isEmpty()) {
			return;
		}

		const visibleBars = timeScale.visibleBars();
		if (visibleBars !== null) {
			priceScale.recalculatePriceRange(visibleBars);
		}
	}

	#createPriceScale(overlay: boolean): PriceScale {
		const options = this.#model.options();
		const priceScaleOptions = clone(options.priceScale);

		if (overlay) {
			// overlay scales are normal scales with autoscale
			priceScaleOptions.autoScale = true;
			priceScaleOptions.mode = PriceScaleMode.Normal;
		}

		const priceScale = new PriceScale(priceScaleOptions, options.layout, options.localization);
		priceScale.setHeight(this.#height);
		return priceScale;
	}
}
