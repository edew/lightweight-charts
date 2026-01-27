import type { LineStyle } from '../renderers/draw-line';
import type { IPaneView } from '../views/pane/ipane-view';
import type { Pane } from './pane';

import { DataSource } from './data-source/data-source';
import { GridPaneView } from '../views/pane/grid-pane-view';
import { ensureDefined } from '../helpers/assertions';

/** Structure describing horizontal or vertical grid line options */
export interface GridLineOptions {
	/** Color of the lines */
	color: string;
	/** Style of the lines */
	style: LineStyle;
	/** Visibility of the lines */
	visible: boolean;
}

/** Structure describing grid options */
export interface GridOptions {
	/** Vertical grid line options */
	vertLines: GridLineOptions;
	/** Horizontal grid line options */
	horzLines: GridLineOptions;
}

export class Grid extends DataSource {
	private _paneViews: Map<Pane, GridPaneView> = new Map();

	public destroy(): void {
		this._paneViews.forEach((paneView: GridPaneView, pane: Pane) => this._onPaneDestroyed(pane));
	}

	public paneViews(pane: Pane): ReadonlyArray<IPaneView> {
		if (!this._paneViews.has(pane)) {
			this._paneViews.set(pane, new GridPaneView(pane));

			pane.onDestroyed().subscribe(() => this._onPaneDestroyed(pane), this);
		}

		return [ensureDefined(this._paneViews.get(pane))];
	}

	public updateAllViews(): void {
		this._paneViews.forEach((paneView: GridPaneView) => paneView.update());
	}

	private _onPaneDestroyed(pane: Pane): void {
		this._paneViews.delete(pane);
		pane.onDestroyed().unsubscribeAll(this);
	}
}
