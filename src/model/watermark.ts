import type { HorzAlign, VertAlign } from '../renderers/watermark-renderer';
import type { IPaneView } from '../views/pane/ipane-view';
import { WatermarkPaneView } from '../views/pane/watermark-pane-view';

import { ChartModel } from './chart-model';
import { DataSource } from './data-source/data-source';

/** Structure describing watermark options */
export interface WatermarkOptions {
	/** Color of the watermark */
	color: string;
	/** Visibility of the watermark. If false, other parameters are ignored */
	visible: boolean;
	/** Text of the watermark. Word wrapping is not supported */
	text: string;
	/** Font size in pixels */
	fontSize: number;
	/** Horizontal alignment of the watermark inside the chart area */
	horzAlign: HorzAlign;
	/** Vertical alignment of the watermark inside the chart area */
	vertAlign: VertAlign;
}

export class Watermark extends DataSource {
	readonly #paneView: WatermarkPaneView;
	readonly #options: WatermarkOptions;

	public constructor(model: ChartModel, options: WatermarkOptions) {
		super();
		this.#options = options;
		this.#paneView = new WatermarkPaneView(this);
	}

	public paneViews(): ReadonlyArray<IPaneView> {
		return [this.#paneView];
	}

	public options(): Readonly<WatermarkOptions> {
		return this.#options;
	}

	public updateAllViews(): void {
		this.#paneView.update();
	}
}
