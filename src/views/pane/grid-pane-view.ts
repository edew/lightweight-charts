import { Pane } from '../../model/pane';
import { GridRenderer, type GridRendererData } from '../../renderers/grid-renderer';
import type { IPaneRenderer } from '../../renderers/ipane-renderer';

import type { IUpdatablePaneView } from './iupdatable-pane-view';

export class GridPaneView implements IUpdatablePaneView {
	readonly #pane: Pane;
	readonly #renderer: GridRenderer = new GridRenderer();
	#invalidated: boolean = true;

	public constructor(pane: Pane) {
		this.#pane = pane;
	}

	public update(): void {
		this.#invalidated = true;
	}

	public renderer(height: number, width: number): IPaneRenderer | null {
		if (this.#invalidated) {
			const gridOptions = this.#pane.model().options().grid;

			const data: GridRendererData = {
				h: height,
				w: width,
				horzLinesVisible: gridOptions.horzLines.visible,
				vertLinesVisible: gridOptions.vertLines.visible,
				horzLinesColor: gridOptions.horzLines.color,
				vertLinesColor: gridOptions.vertLines.color,
				horzLineStyle: gridOptions.horzLines.style,
				vertLineStyle: gridOptions.vertLines.style,
				priceMarks: this.#pane.defaultPriceScale().marks(),
				timeMarks: this.#pane.model().timeScale().marks() || [],
			};

			this.#renderer.setData(data);
			this.#invalidated = false;
		}

		return this.#renderer;
	}

}
