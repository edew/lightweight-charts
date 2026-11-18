// A chart with no DOM. The pixel tests and the benchmark use only this interface,
// so they stay valid while the code below it is rewritten.

import { candlestickStyleDefaults, lineStyleDefaults, seriesOptionsDefaults } from '../../src/api/options/series-options-defaults';
import { chartOptionsDefaults } from '../../src/api/options/chart-options-defaults';
import type { BarData, LineData } from '../../src/api/data-consumer';
import { convertSeriesData, isBusinessDayTime, itemTimeToSeconds } from '../../src/api/data-convert';
import { clone, type DeepPartial, merge } from '../../src/helpers/strict-type-checks';
import { ChartModel, type ChartOptionsInternal } from '../../src/model/chart-model';
import type { Coordinate } from '../../src/model/coordinate';
import type { IDataSource } from '../../src/model/data-source/idata-source';
import type { Series } from '../../src/model/series';
import type { SeriesOptionsMap, SeriesPartialOptionsMap, SeriesType } from '../../src/model/series-options';

export interface HeadlessSeries<T extends SeriesType> {
	setData(data: (T extends 'Line' ? LineData : BarData)[]): void;
	update(item: T extends 'Line' ? LineData : BarData): void;
}

export interface HeadlessChart {
	addSeries<T extends SeriesType>(type: T, options?: SeriesPartialOptionsMap[T]): HeadlessSeries<T>;
	/** Pointer position in CSS pixels in the pane. */
	setCrosshair(x: number, y: number): void;
	clearCrosshair(): void;
	/** Draws the pane (background, grid, series, crosshair) at the origin of the context. */
	draw(ctx: CanvasRenderingContext2D, pixelRatio: number): void;
}

export interface HeadlessChartParams {
	width: number;
	height: number;
	options?: DeepPartial<ChartOptionsInternal>;
}

export const testFontFamily = 'DejaVu Sans';

export function createHeadlessChart(params: HeadlessChartParams): HeadlessChart {
	const options = clone(chartOptionsDefaults);
	options.layout.fontFamily = testFontFamily;
	options.localization.locale = 'en-US';
	merge(options, params.options ?? {});
	options.width = params.width;
	options.height = params.height;

	const model = new ChartModel(() => {}, options);
	const pane = model.panes()[0];
	model.setPaneHeight(pane, params.height);
	model.setWidth(params.width);

	function drawSource(source: IDataSource, ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		for (const paneView of source.paneViews(pane)) {
			const renderer = paneView.renderer(pane.height(), pane.width());
			if (renderer !== null) {
				ctx.save();
				renderer.draw(ctx, pixelRatio, false);
				ctx.restore();
			}
		}
	}

	return {
		addSeries<T extends SeriesType>(type: T, seriesOptions?: SeriesPartialOptionsMap[T]): HeadlessSeries<T> {
			const styleDefaults = type === 'Line' ? lineStyleDefaults : candlestickStyleDefaults;
			const strictOptions = merge(clone(seriesOptionsDefaults), styleDefaults, seriesOptions ?? {}) as SeriesOptionsMap[T];
			const series = model.createSeries(type, strictOptions);
			return {
				setData(data: (LineData | BarData)[]): void {
					const converted = convertSeriesData(series.store().stride, data);
					model.setSeriesData(series as Series, converted.times, converted.values, converted.count, converted.businessDay);
				},
				update(item: LineData | BarData): void {
					const businessDay = model.dataStore().businessDay ?? isBusinessDayTime(item.time);
					const time = itemTimeToSeconds(item.time, businessDay);
					model.dataStore().businessDay = businessDay;
					if (series.store().stride === 1) {
						model.updateSeriesData(series as Series, time, (item as LineData).value, 0, 0, 0);
					} else {
						const bar = item as BarData;
						model.updateSeriesData(series as Series, time, bar.open, bar.high, bar.low, bar.close);
					}
				},
			};
		},

		setCrosshair(x: number, y: number): void {
			model.setAndSaveCurrentPosition(x as Coordinate, y as Coordinate, pane);
		},

		clearCrosshair(): void {
			model.clearCurrentPosition();
		},

		draw(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
			model.recalculateAllPanes();

			ctx.save();
			ctx.fillStyle = model.options().layout.backgroundColor;
			ctx.fillRect(0, 0, Math.ceil(params.width * pixelRatio), Math.ceil(params.height * pixelRatio));

			drawSource(model.gridSource(), ctx, pixelRatio);
			const crosshair = model.crosshairSource();
			for (const source of pane.orderedSources()) {
				for (const paneView of source.paneViews(pane)) {
					const renderer = paneView.renderer(pane.height(), pane.width());
					if (renderer !== null && renderer.drawBackground !== undefined) {
						ctx.save();
						renderer.drawBackground(ctx, pixelRatio, false);
						ctx.restore();
					}
				}
			}
			for (const source of pane.orderedSources()) {
				if (source !== crosshair) {
					drawSource(source, ctx, pixelRatio);
				}
			}
			drawSource(crosshair, ctx, pixelRatio);
			ctx.restore();
		},
	};
}
