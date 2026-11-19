import { expect } from 'chai';
import { describe, it } from 'vitest';

import type {
	BarPrices,
	CandlestickSeriesOptions,
	CandlestickSeriesPartialOptions,
	ChartOptions,
	Coordinate,
	CrosshairOptions,
	DeepPartial,
	GridOptions,
	IChartApi,
	IPriceFormatter,
	ISeriesApi,
	LayoutOptions,
	LineSeriesOptions,
	LineSeriesPartialOptions,
	LocalizationOptions,
	MouseEventHandler,
	Point,
	PriceFormat,
	PriceScaleMargins,
	PriceScaleOptions,
	SeriesType,
	TimeRangeChangeEventHandler,
	TimeScaleOptions,
	WatermarkOptions,
} from '../../src/index';

// An application must be able to name each type that the public interfaces use.
// This file has no value at run time: the type check is the test.
export interface ApplicationCode {
	options: DeepPartial<ChartOptions>;
	parts: [CrosshairOptions, GridOptions, LayoutOptions, LocalizationOptions, PriceScaleOptions, PriceScaleMargins, TimeScaleOptions, WatermarkOptions];
	series: [LineSeriesOptions, LineSeriesPartialOptions, CandlestickSeriesOptions, CandlestickSeriesPartialOptions, PriceFormat, SeriesType];
	handlers: [MouseEventHandler, TimeRangeChangeEventHandler];
	values: [BarPrices, Point, IPriceFormatter];
}

export function priceAtPixel(chart: IChartApi, series: ISeriesApi<'Line'>, y: number): number | null {
	chart.applyOptions({ localization: { priceFormatter: (price: number) => price.toFixed(1) } });
	return series.coordinateToPrice(y as Coordinate);
}

describe('public types', () => {
	it('are exported from the entry file', () => {
		expect(priceAtPixel).to.be.a('function');
	});
});
