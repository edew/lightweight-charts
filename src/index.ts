/// <reference types="_build-time-constants" />

export { LineStyle, LineType } from './draw/line-style';
export type { LineWidth } from './draw/line-style';

export type { BarPrice } from './model/bar';
export { CrosshairMode } from './model/crosshair';
export { PriceScaleMode } from './model/price-scale/price-scale';
export type { SeriesKind, SeriesSpec } from './model/series-kind';
export { PriceAxisLastValueMode } from './model/series-options';
export type { BusinessDay, UTCTimestamp } from './model/time-scale/time-data';

export type {
	BarData,
	LineData,
	Time,
} from './api/data-consumer';
export {
	isBusinessDay,
	isUTCTimestamp,
} from './api/data-consumer';
export type { IChartApi, MouseEventParams } from './api/ichart-api';
export type { IPaneApi } from './api/ipane-api';
export type { IPriceScaleApi } from './api/iprice-scale-api';
export type { ISeriesApi } from './api/iseries-api';
export type { ITimeScaleApi, TimeRange } from './api/itime-scale-api';

export { createChart } from './api/create-chart';

// Each series type is a separate export, so that a bundler can remove the types
// that an application does not use.
export { Candlestick } from './series/candlestick';
export { Line } from './series/line';

export function version(): string {
	return process.env.BUILD_VERSION;
}
