import { makeFont } from '../helpers/make-font';

import { ChartModel } from '../model/chart-model';

import type { PriceAxisViewRendererOptions } from './iprice-axis-view-renderer';

const enum RendererConstants {
	BorderSize = 1,
	TickLength = 4,
}

export class PriceAxisRendererOptionsProvider {
	readonly #chartModel: ChartModel;

	readonly #rendererOptions: PriceAxisViewRendererOptions = {
		borderSize: RendererConstants.BorderSize,
		tickLength: RendererConstants.TickLength,
		fontSize: NaN,
		font: '',
		fontFamily: '',
		color: '',
		paddingBottom: 0,
		paddingInner: 0,
		paddingOuter: 0,
		paddingTop: 0,
		baselineOffset: 0,
	};

	public constructor(chartModel: ChartModel) {
		this.#chartModel = chartModel;
	}

	public options(): Readonly<PriceAxisViewRendererOptions> {
		const rendererOptions = this.#rendererOptions;

		const currentFontSize = this.#fontSize();
		const currentFontFamily = this.#fontFamily();

		if (rendererOptions.fontSize !== currentFontSize || rendererOptions.fontFamily !== currentFontFamily) {
			rendererOptions.fontSize = currentFontSize;
			rendererOptions.fontFamily = currentFontFamily;
			rendererOptions.font = makeFont(currentFontSize, currentFontFamily);
			rendererOptions.paddingTop = Math.floor(currentFontSize / 3.5);
			rendererOptions.paddingBottom = rendererOptions.paddingTop;
			rendererOptions.paddingInner = Math.max(
				Math.ceil(currentFontSize / 2 - rendererOptions.tickLength / 2),
				0
			);
			rendererOptions.paddingOuter = Math.ceil(currentFontSize / 2 + rendererOptions.tickLength / 2);
			rendererOptions.baselineOffset = Math.round(currentFontSize / 10);
		}

		rendererOptions.color = this.#textColor();

		return this.#rendererOptions;
	}

	#textColor(): string {
		return this.#chartModel.options().layout.textColor;
	}

	#fontSize(): number {
		return this.#chartModel.options().layout.fontSize;
	}

	#fontFamily(): string {
		return this.#chartModel.options().layout.fontFamily;
	}
}
