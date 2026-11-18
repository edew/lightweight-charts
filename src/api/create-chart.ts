import { ensureNotNull } from '../helpers/assertions';
import { type DeepPartial, isString } from '../helpers/strict-type-checks';

import type { ChartOptions } from '../model/chart-model';

import { ChartApi } from './chart-api';
import type { IChartApi } from './ichart-api';

/**
 * This function is the main entry point of the Lightweight Charting Library
 * @param container - id of HTML element or element itself
 * @param options - any subset of ChartOptions to be applied at start.
 * @returns an interface to the created chart
 */
export function createChart(container: string | HTMLElement, options?: DeepPartial<ChartOptions>): IChartApi {
	const htmlElement = ensureNotNull(isString(container) ? document.getElementById(container) : container);
	return new ChartApi(htmlElement, options);
}
