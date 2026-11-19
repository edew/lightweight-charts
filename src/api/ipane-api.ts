import type { DeepPartial } from '../helpers/strict-type-checks';

import type { PriceScaleOptions } from '../model/price-scale/price-scale';

/** Interface to control one pane of the chart */
export interface IPaneApi {
	/** Height of the pane in pixels. It is 0 before the first draw of the chart. */
	height(): number;
	/** Relative height of the pane: a pane with factor 2 is two times as high as a pane with factor 1. */
	stretchFactor(): number;
	setStretchFactor(factor: number): void;
	/**
	 * Applies options to the price scale of this pane only. The position of the price
	 * axis is the same for all panes: set it with the options of the chart.
	 */
	applyPriceScaleOptions(options: DeepPartial<Omit<PriceScaleOptions, 'position'>>): void;
	priceScaleOptions(): Readonly<PriceScaleOptions>;
}
