/// <reference types="_build-time-constants" />

export type { LineStyle, LineType, LineWidth } from './renderers/draw-line';

export type { BarPrice } from './model/bar';
export { CrosshairMode } from './model/crosshair';
export { PriceScaleMode } from './model/price-scale';
export { PriceLineSource } from './model/series-options';
export type { UTCTimestamp } from './model/time-data';

export type {
	BarData,
	HistogramData,
	LineData,
} from './api/data-consumer';
export {
	isBusinessDay,
	isUTCTimestamp,
} from './api/data-consumer';
export type { IChartApi, MouseEventParams } from './api/ichart-api';
export type { ISeriesApi } from './api/iseries-api';

export { createChart } from './api/create-chart';

export function version(): string {
	return process.env.BUILD_VERSION;
}
