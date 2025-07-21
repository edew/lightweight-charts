import type { IDestroyable } from '../helpers/idestroyable';
import type { DeepPartial } from '../helpers/strict-type-checks';

import { ChartModel } from '../model/chart-model';
import { PriceScale, type PriceScaleOptions } from '../model/price-scale';

import type { IPriceScaleApi } from './iprice-scale-api';

export class PriceScaleApi implements IPriceScaleApi, IDestroyable {
	private _chartModel: ChartModel;

	public constructor(model: ChartModel) {
		this._chartModel = model;
	}

	public destroy(): void {
		(this._chartModel as unknown as null) = null;
	}

	public applyOptions(options: DeepPartial<PriceScaleOptions>): void {
		this._chartModel.applyOptions({ priceScale: options });
	}

	public options(): Readonly<PriceScaleOptions> {
		return this._priceScale().options();
	}

	private _priceScale(): PriceScale {
		return this._chartModel.mainPriceScale();
	}
}
