import { generateTextColor } from '../../helpers/color';

import { Crosshair, type CrosshairPriceAndCoordinate } from '../../model/crosshair';
import { PriceScale } from '../../model/price-scale/price-scale';
import type { PriceAxisViewRendererCommonData, PriceAxisViewRendererData } from '../../renderers/iprice-axis-view-renderer';

import { PriceAxisView } from './price-axis-view';

export type CrosshairPriceAxisViewValueProvider = (priceScale: PriceScale) => CrosshairPriceAndCoordinate;

export class CrosshairPriceAxisView extends PriceAxisView {
	#source: Crosshair;
	readonly #priceScale: PriceScale;
	readonly #valueProvider: CrosshairPriceAxisViewValueProvider;

	public constructor(source: Crosshair, priceScale: PriceScale, valueProvider: CrosshairPriceAxisViewValueProvider) {
		super();
		this.#source = source;
		this.#priceScale = priceScale;
		this.#valueProvider = valueProvider;
	}

	protected _updateRendererData(
		axisRendererData: PriceAxisViewRendererData,
		paneRendererData: PriceAxisViewRendererData,
		commonRendererData: PriceAxisViewRendererCommonData
	): void {
		axisRendererData.visible = false;
		const options = this.#source.options().horzLine;
		if (!options.labelVisible) {
			return;
		}

		const firstValue = this.#priceScale.firstValue();
		if (!this.#source.visible() || this.#priceScale.isEmpty() || (firstValue === null)) {
			return;
		}

		commonRendererData.background = options.labelBackgroundColor;
		commonRendererData.color = generateTextColor(options.labelBackgroundColor);

		const value = this.#valueProvider(this.#priceScale);
		commonRendererData.coordinate = value.coordinate;
		axisRendererData.text = this.#priceScale.formatPrice(value.price, firstValue);
		axisRendererData.visible = true;
	}
}
