import { generateTextColor } from '../../helpers/color';

import { ChartModel } from '../../model/chart-model';
import { type LastValueDataResultWithData, Series } from '../../model/series';
import { PriceAxisLastValueMode } from '../../model/series-options';
import type { PriceAxisViewRendererCommonData, PriceAxisViewRendererData } from '../../renderers/iprice-axis-view-renderer';

import { PriceAxisView } from './price-axis-view';

export interface SeriesPriceAxisViewData {
	model: ChartModel;
}

export class SeriesPriceAxisView extends PriceAxisView {
	readonly #source: Series;
	readonly #data: SeriesPriceAxisViewData;

	public constructor(source: Series, data: SeriesPriceAxisViewData) {
		super();
		this.#source = source;
		this.#data = data;
	}

	protected _getSource(): Series {
		return this.#source;
	}

	protected _getData(): SeriesPriceAxisViewData {
		return this.#data;
	}

	protected _updateRendererData(
		axisRendererData: PriceAxisViewRendererData,
		paneRendererData: PriceAxisViewRendererData,
		commonRendererData: PriceAxisViewRendererCommonData
	): void {
		axisRendererData.visible = false;
		paneRendererData.visible = false;

		const seriesOptions = this.#source.options();
		const showSeriesLastValue = seriesOptions.lastValueVisible;

		const showSymbolLabel = this.#source.title() !== '';
		const showPriceAndPercentage = seriesOptions.seriesLastValueMode === PriceAxisLastValueMode.LastPriceAndPercentageValue;

		const lastValueData = this.#source.lastValueData(undefined, false);
		if (lastValueData.noData) {
			return;
		}

		if (showSeriesLastValue) {
			axisRendererData.text = this._axisText(lastValueData, showSeriesLastValue, showPriceAndPercentage);
			axisRendererData.visible = axisRendererData.text.length !== 0;
		}

		if (showSymbolLabel || showPriceAndPercentage) {
			paneRendererData.text = this._paneText(lastValueData, showSeriesLastValue, showSymbolLabel, showPriceAndPercentage);
			paneRendererData.visible = paneRendererData.text.length > 0;
		}

		commonRendererData.background = this.#source.priceLineColor(lastValueData.color);
		commonRendererData.color = generateTextColor(commonRendererData.background);
		commonRendererData.coordinate = lastValueData.coordinate;
		paneRendererData.borderColor = this.#source.model().options().layout.backgroundColor;
		axisRendererData.borderColor = commonRendererData.background;
	}

	protected _paneText(
		lastValue: LastValueDataResultWithData,
		showSeriesLastValue: boolean,
		showSymbolLabel: boolean,
		showPriceAndPercentage: boolean
	): string {
		let result = '';

		const title = this.#source.title();

		if (showSymbolLabel && title.length !== 0) {
			result += `${title} `;
		}

		if (showSeriesLastValue && showPriceAndPercentage) {
			result += this.#source.priceScale().isPercentage() ?
				lastValue.formattedPriceAbsolute : lastValue.formattedPricePercentage;
		}

		return result.trim();
	}

	protected _axisText(lastValueData: LastValueDataResultWithData, showSeriesLastValue: boolean, showPriceAndPercentage: boolean): string {
		if (!showSeriesLastValue) {
			return '';
		}

		if (!showPriceAndPercentage) {
			return lastValueData.text;
		}

		return this.#source.priceScale().isPercentage() ?
			lastValueData.formattedPricePercentage : lastValueData.formattedPriceAbsolute;
	}
}
