import { ensureNotNull } from '../../helpers/assertions';

import type { BarPrice } from '../../model/bar';
import { ChartModel, type ChartOptionsInternal } from '../../model/chart-model';
import type { Coordinate } from '../../model/coordinate';
import { Crosshair } from '../../model/crosshair';
import { Series } from '../../model/series';
import type { SeriesItemsIndexesRange, TimePointIndex } from '../../model/time-scale/time-data';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import type { IPaneRenderer } from '../../renderers/ipane-renderer';
import { type MarksRendererData, PaneRendererMarks } from '../../renderers/marks-renderer';

import type { IUpdatablePaneView, UpdateType } from './iupdatable-pane-view';

function createEmptyMarkerData(chartOptions: ChartOptionsInternal): MarksRendererData {
	return {
		items: [{
			x: 0 as Coordinate,
			y: 0 as Coordinate,
			time: 0 as TimePointIndex,
			price: 0 as BarPrice,
		}],
		lineColor: '',
		backColor: chartOptions.layout.backgroundColor,
		radius: 0,
		visibleRange: null,
	};
}

const rangeForSinglePoint: SeriesItemsIndexesRange = { from: 0, to: 1 };

export class CrosshairMarksPaneView implements IUpdatablePaneView {
	readonly #chartModel: ChartModel;
	readonly #crosshair: Crosshair;
	readonly #compositeRenderer: CompositeRenderer = new CompositeRenderer();
	#markersRenderers: PaneRendererMarks[] = [];
	#markersData: MarksRendererData[] = [];
	#invalidated: boolean = true;

	public constructor(chartModel: ChartModel, crosshair: Crosshair) {
		this.#chartModel = chartModel;
		this.#crosshair = crosshair;
		this.#compositeRenderer.setRenderers(this.#markersRenderers);
	}

	public update(updateType?: UpdateType): void {
		const serieses = this.#chartModel.serieses();
		if (serieses.length !== this.#markersRenderers.length) {
			this.#markersData = serieses.map(() => createEmptyMarkerData(this.#chartModel.options()));
			this.#markersRenderers = this.#markersData.map((data: MarksRendererData) => {
				const res = new PaneRendererMarks();
				res.setData(data);
				return res;
			});
			this.#compositeRenderer.setRenderers(this.#markersRenderers);
		}

		this.#invalidated = true;
	}

	public renderer(height: number, width: number, addAnchors?: boolean): IPaneRenderer | null {
		if (this.#invalidated) {
			this.#updateImpl();
			this.#invalidated = false;
		}

		return this.#compositeRenderer;
	}

	#updateImpl(): void {
		const serieses = this.#chartModel.serieses();
		const timePointIndex = this.#crosshair.appliedIndex();
		const timeScale = this.#chartModel.timeScale();

		serieses.forEach((s: Series, index: number) => {
			const data = this.#markersData[index];
			const seriesData = s.markerDataAtIndex(timePointIndex);

			if (seriesData === null) {
				data.visibleRange = null;
				return;
			}

			const firstValue = ensureNotNull(s.firstValue());
			data.lineColor = s.barColorer().barStyle(timePointIndex).barColor;
			data.backColor = this.#chartModel.options().layout.backgroundColor;
			data.radius = seriesData.radius;
			data.items[0].price = seriesData.price;
			data.items[0].y = s.priceScale().priceToCoordinate(seriesData.price, firstValue.value);
			data.items[0].time = timePointIndex;
			data.items[0].x = timeScale.indexToCoordinate(timePointIndex);
			data.visibleRange = rangeForSinglePoint;
		});
	}
}
