import { ensureNotNull } from '../../helpers/assertions';

import { Crosshair } from '../../model/crosshair';
import { CrosshairRenderer, type CrosshairRendererData } from '../../renderers/crosshair-renderer';
import type { IPaneRenderer } from '../../renderers/ipane-renderer';

import type { IPaneView } from './ipane-view';

export class CrosshairPaneView implements IPaneView {
	#invalidated: boolean = true;
	readonly #source: Crosshair;
	readonly #rendererData: CrosshairRendererData = {
		vertLine: {
			lineWidth: 1,
			lineStyle: 0,
			color: '',
			visible: false,
		},
		horzLine: {
			lineWidth: 1,
			lineStyle: 0,
			color: '',
			visible: false,
		},
		w: 0,
		h: 0,
		x: 0,
		y: 0,
	};
	#renderer: CrosshairRenderer = new CrosshairRenderer(this.#rendererData);

	public constructor(source: Crosshair) {
		this.#source = source;
	}

	public update(): void {
		this.#invalidated = true;
	}

	public renderer(height: number, width: number): IPaneRenderer {
		if (this.#invalidated) {
			this.#updateImpl();
		}

		return this.#renderer;
	}

	#updateImpl(): void {
		const visible = this.#source.visible();
		const pane = ensureNotNull(this.#source.pane());
		const crosshairOptions = pane.model().options().crosshair;

		const data = this.#rendererData;

		data.horzLine.visible = visible && this.#source.horzLineVisible(pane);
		data.vertLine.visible = visible && this.#source.vertLineVisible();

		data.horzLine.lineWidth = crosshairOptions.horzLine.width;
		data.horzLine.lineStyle = crosshairOptions.horzLine.style;
		data.horzLine.color = crosshairOptions.horzLine.color;

		data.vertLine.lineWidth = crosshairOptions.vertLine.width;
		data.vertLine.lineStyle = crosshairOptions.vertLine.style;
		data.vertLine.color = crosshairOptions.vertLine.color;

		data.w = pane.width();
		data.h = pane.height();

		data.x = this.#source.appliedX();
		data.y = this.#source.appliedY();
	}
}
