import { undefinedIfNull } from '../../helpers/strict-type-checks';

import type { BarCoordinates, BarPrice, BarPrices } from '../../model/bar';
import { ChartModel } from '../../model/chart-model';
import type { Coordinate } from '../../model/coordinate';
import { PriceScale } from '../../model/price-scale/price-scale';
import { Series } from '../../model/series';
import { SeriesBarColorer } from '../../model/series-bar-colorer';
import type { TimePointIndex, TimedValue } from '../../model/time-scale/time-data';
import { TimeScale } from '../../model/time-scale/time-scale';
import { SeriesPaneViewBase } from './series-pane-view-base';

export abstract class BarsPaneViewBase<TSeriesType extends 'Candlestick', ItemType extends TimedValue & BarPrices & BarCoordinates> extends SeriesPaneViewBase<TSeriesType, ItemType> {
	public constructor(series: Series<TSeriesType>, model: ChartModel) {
		super(series, model, false);
	}

	protected _convertToCoordinates(priceScale: PriceScale, timeScale: TimeScale, firstValue: number): void {
		timeScale.indexesToCoordinates(this._items, undefinedIfNull(this._itemsVisibleRange));
		priceScale.barPricesToCoordinates(this._items, firstValue, undefinedIfNull(this._itemsVisibleRange));
	}

	protected abstract _createRawItem(time: TimePointIndex, row: number, colorer: SeriesBarColorer): ItemType;

	protected _createDefaultItem(time: TimePointIndex, row: number): TimedValue & BarPrices & BarCoordinates {
		const values = this._series.store().values;
		const offset = row * 4;
		return {
			time: time,
			open: values[offset] as BarPrice,
			high: values[offset + 1] as BarPrice,
			low: values[offset + 2] as BarPrice,
			close: values[offset + 3] as BarPrice,
			x: NaN as Coordinate,
			openY: NaN as Coordinate,
			highY: NaN as Coordinate,
			lowY: NaN as Coordinate,
			closeY: NaN as Coordinate,
		};
	}

	protected _fillRawPoints(): void {
		const store = this._series.store();
		const colorer = this._series.barColorer();
		const newItems: ItemType[] = new Array(store.length);
		for (let row = 0; row < store.length; row++) {
			newItems[row] = this._createRawItem(store.timeIndexAt(row) as TimePointIndex, row, colorer);
		}
		this._items = newItems;
	}
}
