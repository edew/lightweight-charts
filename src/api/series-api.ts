import type { IDestroyable } from '../helpers/idestroyable';
import { clone } from '../helpers/strict-type-checks';

import type { BarPrice } from '../model/bar';
import type { Coordinate } from '../model/coordinate';
import { Series } from '../model/series';
import type {
	SeriesOptionsMap,
	SeriesPartialOptionsMap,
	SeriesType,
} from '../model/series-options';

import type { DataUpdatesConsumer, SeriesDataItemTypeMap } from './data-consumer';
import type { IPriceFormatter, ISeriesApi } from './iseries-api';

export class SeriesApi<TSeriesType extends SeriesType> implements ISeriesApi<TSeriesType>, IDestroyable {
	protected _series: Series<TSeriesType>;
	protected _dataUpdatesConsumer: DataUpdatesConsumer<TSeriesType>;

	public constructor(series: Series<TSeriesType>, dataUpdatesConsumer: DataUpdatesConsumer<TSeriesType>) {
		this._series = series;
		this._dataUpdatesConsumer = dataUpdatesConsumer;
	}

	public destroy(): void {
		(this._series as unknown as null) = null;
		(this._dataUpdatesConsumer as unknown as null) = null;
	}

	public priceFormatter(): IPriceFormatter {
		return this._series.formatter();
	}

	public series(): Series<TSeriesType> {
		return this._series;
	}

	public priceToCoordinate(price: BarPrice): Coordinate | null {
		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return null;
		}

		return this._series.priceScale().priceToCoordinate(price, firstValue.value);
	}

	public coordinateToPrice(coordinate: Coordinate): BarPrice | null {
		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return null;
		}
		return this._series.priceScale().coordinateToPrice(coordinate, firstValue.value);
	}

	public setData(data: SeriesDataItemTypeMap[TSeriesType][]): void {
		this._dataUpdatesConsumer.applyNewData(this._series, data);
	}

	public update(bar: SeriesDataItemTypeMap[TSeriesType]): void {
		this._dataUpdatesConsumer.updateData(this._series, bar);
	}

	public applyOptions(options: SeriesPartialOptionsMap[TSeriesType]): void {
		this._series.applyOptions(options);
	}

	public options(): Readonly<SeriesOptionsMap[TSeriesType]> {
		return clone(this._series.options());
	}
}
