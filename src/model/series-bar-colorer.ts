import { ensure, ensureNotNull } from '../helpers/assertions';

import { PlotList } from './plot-list';
import { Series } from './series';
import { type Bar, SeriesPlotIndex } from './series-data';
import type {
	CandlestickStyleOptions,
	LineStyleOptions,
} from './series-options';
import type { TimePoint, TimePointIndex } from './time-scale/time-data';

export interface PrecomputedBars {
	value: Bar;
	previousValue?: Bar;
}

export interface BarColorerStyle {
	barColor: string;
	barBorderColor: string; // Used in Candlesticks
	barWickColor: string; // Used in Candlesticks
}

const emptyResult: BarColorerStyle = {
	barColor: '',
	barBorderColor: '',
	barWickColor: '',
};

export class SeriesBarColorer {
	#series: Series;

	public constructor(series: Series) {
		this.#series = series;
	}

	public barStyle(barIndex: TimePointIndex, precomputedBars?: PrecomputedBars): BarColorerStyle {
		// precomputedBars: {value: [Array BarValues], previousValue: [Array BarValues] | undefined}
		// Used to avoid binary search if bars are already known

		const targetType = this.#series.seriesType();
		const seriesOptions = this.#series.options();
		switch (targetType) {
			case 'Line':
				return this.#lineStyle(seriesOptions as LineStyleOptions);

			case 'Candlestick':
				return this.#candleStyle(seriesOptions as CandlestickStyleOptions, barIndex, precomputedBars);
		}

		throw new Error('Unknown chart style');
	}

	#candleStyle(candlestickStyle: CandlestickStyleOptions, barIndex: TimePointIndex, precomputedBars?: PrecomputedBars): BarColorerStyle {
		const result = { ...emptyResult };

		const upColor = candlestickStyle.upColor;
		const downColor = candlestickStyle.downColor;
		const borderUpColor = candlestickStyle.borderUpColor;
		const borderDownColor = candlestickStyle.borderDownColor;

		const wickUpColor = candlestickStyle.wickUpColor;
		const wickDownColor = candlestickStyle.wickDownColor;

		const currentBar = ensureNotNull(this.#findBar(barIndex, precomputedBars));
		const isUp = ensure(currentBar.value[SeriesPlotIndex.Open]) <= ensure(currentBar.value[SeriesPlotIndex.Close]);

		result.barColor = isUp ? upColor : downColor;
		result.barBorderColor = isUp ? borderUpColor : borderDownColor;
		result.barWickColor = isUp ? wickUpColor : wickDownColor;

		return result;
	}

	#lineStyle(lineStyle: LineStyleOptions): BarColorerStyle {
		return {
			...emptyResult,
			barColor: lineStyle.color,
		};
	}

	#getSeriesBars(): PlotList<TimePoint, Bar['value']> {
		return this.#series.bars();
	}

	#findBar(barIndex: TimePointIndex, precomputedBars?: PrecomputedBars): Bar | null {
		if (precomputedBars !== undefined) {
			return precomputedBars.value;
		}

		return this.#getSeriesBars().valueAt(barIndex);
	}
}
