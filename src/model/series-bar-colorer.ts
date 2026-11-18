import { Series } from './series';
import type {
	CandlestickStyleOptions,
	LineStyleOptions,
} from './series-options';

export interface BarColorerStyle {
	barColor: string;
	barBorderColor: string; // Used in Candlesticks
	barWickColor: string; // Used in Candlesticks
}

export class SeriesBarColorer {
	#series: Series;

	public constructor(series: Series) {
		this.#series = series;
	}

	/** Colors of the bar in the given row of the series store. */
	public barStyle(row: number): BarColorerStyle {
		const seriesOptions = this.#series.options();
		if (this.#series.seriesType() === 'Line') {
			return {
				barColor: (seriesOptions as LineStyleOptions).color,
				barBorderColor: '',
				barWickColor: '',
			};
		}

		const style = seriesOptions as CandlestickStyleOptions;
		const values = this.#series.store().values;
		const isUp = values[row * 4] <= values[row * 4 + 3];

		return {
			barColor: isUp ? style.upColor : style.downColor,
			barBorderColor: isUp ? style.borderUpColor : style.borderDownColor,
			barWickColor: isUp ? style.wickUpColor : style.wickDownColor,
		};
	}
}
