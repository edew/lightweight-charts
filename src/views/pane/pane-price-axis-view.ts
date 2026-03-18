import { ChartModel } from '../../model/chart-model';
import type { IDataSource } from '../../model/data-source/idata-source';
import { TextWidthCache } from '../../model/text-width-cache';
import type { IPaneRenderer } from '../../renderers/ipane-renderer';
import type { IPriceAxisViewRenderer, PriceAxisViewRendererOptions } from '../../renderers/iprice-axis-view-renderer';

import type { IPriceAxisView } from '../price-axis/iprice-axis-view';
import type { IPaneView } from './ipane-view';

class PanePriceAxisViewRenderer implements IPaneRenderer {
	#priceAxisViewRenderer: IPriceAxisViewRenderer | null = null;
	#rendererOptions: PriceAxisViewRendererOptions | null = null;
	#align: 'left' | 'right' = 'right';
	#width: number = 0;
	readonly #textWidthCache: TextWidthCache;

	public constructor(textWidthCache: TextWidthCache) {
		this.#textWidthCache = textWidthCache;
	}

	public setParams(
		priceAxisViewRenderer: IPriceAxisViewRenderer,
		rendererOptions: PriceAxisViewRendererOptions,
		width: number,
		align: 'left' | 'right'
	): void {
		this.#priceAxisViewRenderer = priceAxisViewRenderer;
		this.#rendererOptions = rendererOptions;
		this.#width = width;
		this.#align = align;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (this.#rendererOptions === null || this.#priceAxisViewRenderer === null) {
			return;
		}

		this.#priceAxisViewRenderer.draw(ctx, this.#rendererOptions, this.#textWidthCache, this.#width, this.#align, pixelRatio);
	}
}

export class PanePriceAxisView implements IPaneView {
	#priceAxisView: IPriceAxisView;
	readonly #textWidthCache: TextWidthCache;
	readonly #dataSource: IDataSource;
	readonly #chartModel: ChartModel;
	readonly #renderer: PanePriceAxisViewRenderer;
	#fontSize: number;

	public constructor(priceAxisView: IPriceAxisView, dataSource: IDataSource, chartModel: ChartModel) {
		this.#priceAxisView = priceAxisView;
		this.#textWidthCache = new TextWidthCache(50); // when should we clear cache?
		this.#dataSource = dataSource;
		this.#chartModel = chartModel;
		this.#fontSize = -1;
		this.#renderer = new PanePriceAxisViewRenderer(this.#textWidthCache);
	}

	public update(): void {
		this.#priceAxisView.update();
	}

	public renderer(height: number, width: number): IPaneRenderer | null {
		const pane = this.#chartModel.paneForSource(this.#dataSource);
		if (pane === null) {
			return null;
		}

		const priceScale = this.#dataSource.priceScale();
		if (priceScale === null) {
			return null;
		}

		const position = pane.priceScalePosition();
		if (position === 'overlay') {
			// both source and main source are overlays
			return null;
		}

		const options = this.#chartModel.priceAxisRendererOptions();
		if (options.fontSize !== this.#fontSize) {
			this.#fontSize = options.fontSize;
			this.#textWidthCache.reset();
		}

		this.#renderer.setParams(this.#priceAxisView.paneRenderer(), options, width, position);
		return this.#renderer;
	}
}
