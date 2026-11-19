/// <reference types="_build-time-constants" />

export { LineStyle, LineType } from './draw/line-style';
export type { LineWidth } from './draw/line-style';

export type { DeepPartial } from './helpers/strict-type-checks';

export type { BarPrice, BarPrices } from './model/bar';
export type { ChartOptions, HandleScaleOptions, HandleScrollOptions } from './model/chart-model';
export type { Coordinate } from './model/coordinate';
export { CrosshairMode } from './model/crosshair';
export type { CrosshairLineOptions, CrosshairOptions } from './model/crosshair';
export type { GridLineOptions, GridOptions } from './model/grid';
export type { LayoutOptions } from './model/layout-options';
export type { LocalizationOptions, TimeFormatterFn } from './model/localization-options';
export { PriceScaleMode } from './model/price-scale/price-scale';
export type { PriceAxisPosition, PriceScaleMargins, PriceScaleOptions } from './model/price-scale/price-scale';
export type { SeriesKind, SeriesSpec } from './model/series-kind';
export { PriceAxisLastValueMode } from './model/series-options';
export type {
	CandlestickSeriesOptions,
	CandlestickSeriesPartialOptions,
	CandlestickStyleOptions,
	LineSeriesOptions,
	LineSeriesPartialOptions,
	LineStyleOptions,
	PriceFormat,
	PriceFormatBuiltIn,
	PriceFormatCustom,
	SeriesOptionsCommon,
	SeriesType,
} from './model/series-options';
export type { BusinessDay, UTCTimestamp } from './model/time-scale/time-data';
export type { TimeScaleOptions } from './model/time-scale/time-scale';
export type { HorzAlign, VertAlign, WatermarkOptions } from './model/watermark';

export type {
	BarData,
	LineData,
	Time,
} from './api/data-consumer';
export {
	isBusinessDay,
	isUTCTimestamp,
} from './api/data-consumer';
export type { IChartApi, MouseEventHandler, MouseEventParams, Point, TimeRangeChangeEventHandler } from './api/ichart-api';
export type { IPaneApi } from './api/ipane-api';
export type { IPriceScaleApi } from './api/iprice-scale-api';
export type { IPriceFormatter, ISeriesApi } from './api/iseries-api';
export type { ITimeScaleApi, TimeRange } from './api/itime-scale-api';

export { createChart } from './api/create-chart';

// Each series type is a separate export, so that a bundler can remove the types
// that an application does not use.
export { Candlestick } from './series/candlestick';
export { Line } from './series/line';

export function version(): string {
	return process.env.BUILD_VERSION;
}
