import { makeFont } from '../../helpers/make-font';

import { Watermark } from '../../model/watermark';
import type { IPaneRenderer } from '../../renderers/ipane-renderer';
import { WatermarkRenderer, type WatermarkRendererData } from '../../renderers/watermark-renderer';

import type { IUpdatablePaneView } from './iupdatable-pane-view';

export class WatermarkPaneView implements IUpdatablePaneView {
	#source: Watermark;
	#invalidated: boolean = true;

	readonly #rendererData: WatermarkRendererData = {
		visible: false,
		color: '',
		height: 0,
		width: 0,
		lines: [],
		vertAlign: 'center',
		horzAlign: 'center',
	};
	readonly #renderer: WatermarkRenderer = new WatermarkRenderer(this.#rendererData);

	public constructor(source: Watermark) {
		this.#source = source;
	}

	public update(): void {
		this.#invalidated = true;
	}

	public renderer(height: number, width: number): IPaneRenderer {
		if (this.#invalidated) {
			this.#updateImpl(height, width);
			this.#invalidated = false;
		}

		return this.#renderer;
	}

	#updateImpl(height: number, width: number): void {
		const options = this.#source.options();
		const data = this.#rendererData;
		data.visible = options.visible;

		if (!data.visible) {
			return;
		}

		data.color = options.color;
		data.width = width;
		data.height = height;
		data.horzAlign = options.horzAlign;
		data.vertAlign = options.vertAlign;

		data.lines = [
			{
				text: options.text,
				font: makeFont(options.fontSize),
				lineHeight: options.fontSize * 1.2,
				vertOffset: 0,
				zoom: 0,
			},
		];
	}
}
