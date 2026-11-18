import { undefinedIfNull } from '../../helpers/strict-type-checks';

import type { BarPrice } from '../../model/bar';
import { ChartModel } from '../../model/chart-model';
import type { Coordinate } from '../../model/coordinate';
import { type PricedValue, PriceScale } from '../../model/price-scale/price-scale';
import { Series } from '../../model/series';
import { SeriesBarColorer } from '../../model/series-bar-colorer';
import type { TimedValue, TimePointIndex } from '../../model/time-scale/time-data';
import { TimeScale } from '../../model/time-scale/time-scale';

import { SeriesPaneViewBase } from './series-pane-view-base';

export abstract class LinePaneViewBase<TSeriesType extends 'Line', ItemType extends PricedValue & TimedValue> extends SeriesPaneViewBase<TSeriesType, ItemType> {
	protected constructor(series: Series<TSeriesType>, model: ChartModel) {
		super(series, model, true);
	}

	protected _convertToCoordinates(priceScale: PriceScale, timeScale: TimeScale, firstValue: number): void {
		timeScale.indexesToCoordinates(this._items, undefinedIfNull(this._itemsVisibleRange));
		priceScale.pointsArrayToCoordinates(this._items, firstValue, undefinedIfNull(this._itemsVisibleRange));
	}

	protected abstract _createRawItem(time: TimePointIndex, price: BarPrice, colorer: SeriesBarColorer): ItemType;

	protected _createRawItemBase(time: TimePointIndex, price: BarPrice): PricedValue & TimedValue {
		return {
			time: time,
			price: price,
			x: NaN as Coordinate,
			y: NaN as Coordinate,
		};
	}

	protected _fillRawPoints(): void {
		const store = this._series.store();
		const colorer = this._series.barColorer();
		const newItems: ItemType[] = new Array(store.length);
		for (let row = 0; row < store.length; row++) {
			newItems[row] = this._createRawItem(store.timeIndexAt(row) as TimePointIndex, store.values[row] as BarPrice, colorer);
		}
		this._items = newItems;
	}
}
