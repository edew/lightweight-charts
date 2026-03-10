import { expect } from 'chai';
import { describe, it } from 'vitest';

import { SeriesBarColorer } from '../../src/model/series-bar-colorer';
import type { Series } from '../../src/model/series';
import { type Bar } from '../../src/model/series-data';
import type { TimePoint, TimePointIndex } from '../../src/model/time-scale/time-data';

describe('SeriesBarColorer', () => {
	it('should return correct line style', () => {
		const series = {
			seriesType: () => 'Line',
			options: () => ({ color: '#ff0000' }),
			bars: () => ({}),
		} as unknown as Series;

		const colorer = new SeriesBarColorer(series);
		const style = colorer.barStyle(0 as TimePointIndex);

		expect(style.barColor).to.equal('#ff0000');
		expect(style.barBorderColor).to.equal('');
		expect(style.barWickColor).to.equal('');
	});

	it('should return correct candlestick style for up candle', () => {
		const series = {
			seriesType: () => 'Candlestick',
			options: () => ({
				upColor: 'upColor',
				downColor: 'downColor',
				borderUpColor: 'borderUpColor',
				borderDownColor: 'borderDownColor',
				wickUpColor: 'wickUpColor',
				wickDownColor: 'wickDownColor',
			}),
			bars: () => ({}),
		} as unknown as Series;

		const colorer = new SeriesBarColorer(series);

		const precomputedBars = {
			value: {
				time: { timestamp: 0 } as TimePoint,
				value: [10, 20, 5, 15, null],
			} as Bar,
		};

		const style = colorer.barStyle(0 as TimePointIndex, precomputedBars);

		expect(style.barColor).to.equal('upColor');
		expect(style.barBorderColor).to.equal('borderUpColor');
		expect(style.barWickColor).to.equal('wickUpColor');
	});

	it('should return correct candlestick style for down candle', () => {
		const series = {
			seriesType: () => 'Candlestick',
			options: () => ({
				upColor: 'upColor',
				downColor: 'downColor',
				borderUpColor: 'borderUpColor',
				borderDownColor: 'borderDownColor',
				wickUpColor: 'wickUpColor',
				wickDownColor: 'wickDownColor',
			}),
			bars: () => ({}),
		} as unknown as Series;

		const colorer = new SeriesBarColorer(series);

		const precomputedBars = {
			value: {
				time: { timestamp: 0 } as TimePoint,
				value: [15, 20, 5, 10, null],
			} as Bar,
		};

		const style = colorer.barStyle(0 as TimePointIndex, precomputedBars);

		expect(style.barColor).to.equal('downColor');
		expect(style.barBorderColor).to.equal('borderDownColor');
		expect(style.barWickColor).to.equal('wickDownColor');
	});
});
