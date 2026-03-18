import type { IDestroyable } from '../helpers/idestroyable';
import type { DeepPartial } from '../helpers/strict-type-checks';

import { ChartModel } from '../model/chart-model';
import { PriceScale, type PriceScaleOptions } from '../model/price-scale/price-scale';

import type { IPriceScaleApi } from './iprice-scale-api';

export class PriceScaleApi implements IPriceScaleApi, IDestroyable {
	#chartModel: ChartModel;

	public constructor(model: ChartModel) {
		this.#chartModel = model;
	}

	public destroy(): void {
		(this.#chartModel as unknown as null) = null;
	}

	public applyOptions(options: DeepPartial<PriceScaleOptions>): void {
		this.#chartModel.applyOptions({ priceScale: options });
	}

	public options(): Readonly<PriceScaleOptions> {
		return this.#priceScale().options();
	}

	#priceScale(): PriceScale {
		return this.#chartModel.mainPriceScale();
	}
}
