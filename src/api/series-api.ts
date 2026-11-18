
import { clone, type DeepPartial, merge } from '../helpers/strict-type-checks';

import type { BarPrice } from '../model/bar';
import type { Coordinate } from '../model/coordinate';
import type { Series } from '../model/series';
import type { SeriesSpec } from '../model/series-kind';
import {
	precisionByMinMove,
	type PriceFormat,
	type PriceFormatBuiltIn,
	type SeriesOptionsMap,
	type SeriesPartialOptionsMap,
	type SeriesType,
} from '../model/series-options';

import type { BarData, LineData, SeriesDataItemTypeMap } from './data-consumer';
import { convertSeriesData, isBusinessDayTime, itemTimeToSeconds } from './data-convert';
import type { IPriceFormatter, ISeriesApi } from './iseries-api';
import { seriesOptionsDefaults } from './options/series-options-defaults';

function patchPriceFormat(priceFormat?: DeepPartial<PriceFormat>): void {
	if (priceFormat === undefined || priceFormat.type === 'custom') {
		return;
	}
	const priceFormatBuiltIn = priceFormat as DeepPartial<PriceFormatBuiltIn>;
	if (priceFormatBuiltIn.minMove !== undefined && priceFormatBuiltIn.precision === undefined) {
		priceFormatBuiltIn.precision = precisionByMinMove(priceFormatBuiltIn.minMove);
	}
}

/** Makes a copy of the options of the user with all derived options set. The input is not changed. */
function normalizedOptions<T extends SeriesType>(spec: SeriesSpec<T>, options: SeriesPartialOptionsMap[T]): SeriesPartialOptionsMap[T] {
	const result = clone(options);
	if (spec.kind.normalizeOptions !== undefined) {
		spec.kind.normalizeOptions(result);
	}
	patchPriceFormat(result.priceFormat);
	return result;
}

/** The full options of a new series: common defaults, defaults of the kind, options of the user. */
export function seriesOptionsFromSpec<T extends SeriesType>(spec: SeriesSpec<T>): SeriesOptionsMap[T] {
	return merge(clone(seriesOptionsDefaults), clone(spec.kind.defaults), normalizedOptions(spec, spec.options)) as SeriesOptionsMap[T];
}

/** Replaces all data of a series with the data items of the user. */
export function setSeriesData(series: Series, data: readonly (LineData | BarData)[]): void {
	const converted = convertSeriesData(series.store().stride, data);
	series.model().setSeriesData(series, converted.times, converted.values, converted.count, converted.businessDay);
}

/** Updates the last bar of a series or adds a new bar. */
export function updateSeriesData(series: Series, item: LineData | BarData): void {
	const model = series.model();
	const store = model.dataStore();
	// the first data of a chart sets the type of time for all series
	const businessDay = store.businessDay ?? isBusinessDayTime(item.time);
	const time = itemTimeToSeconds(item.time, businessDay);
	store.businessDay = businessDay;

	if (series.store().stride === 1) {
		model.updateSeriesData(series, time, (item as LineData).value, 0, 0, 0);
	} else {
		const bar = item as BarData;
		model.updateSeriesData(series, time, bar.open, bar.high, bar.low, bar.close);
	}
}

export class SeriesApi<TSeriesType extends SeriesType> implements ISeriesApi<TSeriesType> {
	readonly #series: Series<TSeriesType>;
	readonly #spec: SeriesSpec<TSeriesType>;

	public constructor(series: Series<TSeriesType>, spec: SeriesSpec<TSeriesType>) {
		this.#series = series;
		this.#spec = spec;
	}

	public series(): Series<TSeriesType> {
		return this.#series;
	}

	public priceFormatter(): IPriceFormatter {
		return { format: this.#series.formatter() };
	}

	public priceToCoordinate(price: BarPrice): Coordinate | null {
		const firstValue = this.#series.firstValue();
		if (firstValue === null) {
			return null;
		}

		return this.#series.priceScale().priceToCoordinate(price, firstValue.value);
	}

	public coordinateToPrice(coordinate: Coordinate): BarPrice | null {
		const firstValue = this.#series.firstValue();
		if (firstValue === null) {
			return null;
		}
		return this.#series.priceScale().coordinateToPrice(coordinate, firstValue.value);
	}

	public setData(data: SeriesDataItemTypeMap[TSeriesType][]): void {
		setSeriesData(this.#series as unknown as Series, data);
	}

	public update(bar: SeriesDataItemTypeMap[TSeriesType]): void {
		updateSeriesData(this.#series as unknown as Series, bar);
	}

	public applyOptions(options: SeriesPartialOptionsMap[TSeriesType]): void {
		this.#series.applyOptions(normalizedOptions(this.#spec, options));
	}

	public options(): Readonly<SeriesOptionsMap[TSeriesType]> {
		return clone(this.#series.options());
	}
}
