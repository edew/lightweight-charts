// A chart with no DOM: the model and the frame functions of the library, with any
// canvas context. The pixel tests and the benchmark use it.

import { chartOptionsDefaults } from '../../src/api/options/chart-options-defaults';
import type { BarData, LineData } from '../../src/api/data-consumer';
import { seriesOptionsFromSpec, setSeriesData, updateSeriesData } from '../../src/api/series-api';
import { drawFrame, prepareFrame } from '../../src/draw/chart';
import type { Layout } from '../../src/draw/layout';
import { clone, type DeepPartial, merge } from '../../src/helpers/strict-type-checks';
import { ChartModel, type ChartOptionsInternal, InvalidationLevel } from '../../src/model/chart-model';
import type { Series } from '../../src/model/series';
import type { SeriesSpec } from '../../src/model/series-kind';
import type { SeriesPartialOptionsMap, SeriesType } from '../../src/model/series-options';
import { Candlestick } from '../../src/series/candlestick';
import { Line } from '../../src/series/line';

export interface HeadlessSeries<T extends SeriesType> {
	setData(data: (T extends 'Line' ? LineData : BarData)[]): void;
	update(item: T extends 'Line' ? LineData : BarData): void;
}

export interface HeadlessChart {
	addSeries<T extends SeriesType>(type: T, options?: SeriesPartialOptionsMap[T]): HeadlessSeries<T>;
	/** Pointer position in CSS pixels in a pane. */
	setCrosshair(x: number, y: number, paneIndex?: number): void;
	clearCrosshair(): void;
	/** Scrolls the time scale by a number of CSS pixels. */
	scrollBy(pixels: number): void;
	/** Sets the relative heights of the panes. */
	setPaneStretch(paneIndex: number, stretch: number): void;
	/** Draws the chart at the origin of the context: the static content, then the crosshair. */
	draw(ctx: CanvasRenderingContext2D, pixelRatio: number): void;
	layout(ctx: CanvasRenderingContext2D): Layout;
	model: ChartModel;
}

export interface HeadlessChartParams {
	width: number;
	height: number;
	/**
	 * By default the chart has no axes, so the pane has the full size of the chart.
	 * Give `priceScale.position` and `timeScale.visible` to draw the axes.
	 */
	options?: DeepPartial<ChartOptionsInternal>;
}

export const testFontFamily = 'DejaVu Sans';

export function createHeadlessChart(params: HeadlessChartParams): HeadlessChart {
	const options = clone(chartOptionsDefaults);
	options.layout.fontFamily = testFontFamily;
	options.localization.locale = 'en-US';
	options.priceScale.position = 'none';
	options.timeScale.visible = false;
	merge(options, params.options ?? {});
	options.width = params.width;
	options.height = params.height;

	const model = new ChartModel(() => {}, options);
	// as in the widget: the model has a size before it gets data
	model.setSize(params.width, [params.height]);

	return {
		model,

		addSeries<T extends SeriesType>(type: T, seriesOptions?: SeriesPartialOptionsMap[T]): HeadlessSeries<T> {
			const spec = (type === 'Line' ? Line(seriesOptions ?? {}) : Candlestick(seriesOptions ?? {})) as unknown as SeriesSpec<T>;
			const strictOptions = seriesOptionsFromSpec(spec);
			const series = model.createSeries(spec.kind, strictOptions, strictOptions.pane) as unknown as Series;
			return {
				setData: (data: (LineData | BarData)[]) => setSeriesData(series, data),
				update: (item: LineData | BarData) => updateSeriesData(series, item),
			};
		},

		setCrosshair(x: number, y: number, paneIndex: number = 0): void {
			model.setCrosshairPosition(x, y, model.panes()[paneIndex]);
		},

		clearCrosshair(): void {
			model.clearCrosshairPosition();
		},

		scrollBy(pixels: number): void {
			model.timeScale().scrollBy(pixels);
		},

		setPaneStretch(paneIndex: number, stretch: number): void {
			model.panes()[paneIndex].stretch = stretch;
		},

		layout(ctx: CanvasRenderingContext2D): Layout {
			return prepareFrame(ctx, model, params.width, params.height, InvalidationLevel.Full, null);
		},

		draw(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
			// the frame of the widget, with one canvas for the static content and the crosshair
			const layout = prepareFrame(ctx, model, params.width, params.height, InvalidationLevel.Full, null);
			drawFrame(ctx, ctx, model, layout, pixelRatio, InvalidationLevel.Full);
		},
	};
}
