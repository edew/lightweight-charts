import type { DeepPartial } from '../helpers/strict-type-checks';

import type { PriceScaleOptions } from '../model/price-scale/price-scale';

/** Interface to control the price scales of the chart. The options apply to the price scale of each pane. */
export interface IPriceScaleApi {
	/**
	 * Applies new options to the price scale
	 * @param options - any subset of PriceScaleOptions
	 */
	applyOptions(options: DeepPartial<PriceScaleOptions>): void;

	/**
	 * Returns currently applied options of the price scale
	 * @returns full set of currently applied options, including defaults
	 */
	options(): Readonly<PriceScaleOptions>;
}
