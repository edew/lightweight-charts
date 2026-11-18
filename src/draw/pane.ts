// Draw functions for the content of one pane. Each function draws at the origin of
// the context, in device pixels: the caller translates and clips to the pane.

import { makeFont } from '../helpers/make-font';

import type { ChartModel } from '../model/chart-model';
import type { Pane } from '../model/pane';
import { PriceScaleMode } from '../model/price-scale/price-scale';
import type { Series } from '../model/series';
import type { SeriesDrawData } from '../model/series-kind';
import { PriceAxisLastValueMode } from '../model/series-options';
import type { TimeScale } from '../model/time-scale/time-scale';

import { contrastTextColor, drawPriceLabel, labelMetrics } from './labels';
import { setLineStyle } from './line-style';

// Scratch buffers for the visible bars. All series share them; they only grow.
const drawData: SeriesDrawData = {
	count: 0,
	xs: new Float64Array(0),
	ys: new Float64Array(0),
	values: new Float64Array(0),
	firstRow: 0,
	barSpacing: 0,
	pixelRatio: 1,
};

function strokeOffset(ctx: CanvasRenderingContext2D): number {
	// a line with an odd width is sharp only when it is on the center of a pixel
	return (ctx.lineWidth % 2) ? 0.5 : 0;
}

function drawGrid(ctx: CanvasRenderingContext2D, model: ChartModel, pane: Pane, pixelRatio: number): void {
	const options = model.options().grid;
	if (!options.vertLines.visible && !options.horzLines.visible) {
		return;
	}

	const lineWidth = Math.max(1, Math.floor(pixelRatio));
	const height = Math.ceil(pane.height() * pixelRatio);
	const width = Math.ceil(model.timeScale().width() * pixelRatio);

	ctx.save();
	ctx.lineWidth = lineWidth;
	if (lineWidth % 2) {
		ctx.translate(0.5, 0.5);
	}

	if (options.vertLines.visible) {
		const timeMarks = model.timeScale().marks();
		if (timeMarks !== null) {
			ctx.strokeStyle = options.vertLines.color;
			setLineStyle(ctx, options.vertLines.style);
			ctx.beginPath();
			for (let i = 0; i < timeMarks.length; i++) {
				const x = Math.round(timeMarks[i].coord * pixelRatio);
				ctx.moveTo(x, -lineWidth);
				ctx.lineTo(x, height + lineWidth);
			}
			ctx.stroke();
		}
	}

	if (options.horzLines.visible) {
		const priceMarks = pane.priceScale.marks();
		ctx.strokeStyle = options.horzLines.color;
		setLineStyle(ctx, options.horzLines.style);
		ctx.beginPath();
		for (let i = 0; i < priceMarks.length; i++) {
			const y = Math.round(priceMarks[i].coord * pixelRatio);
			ctx.moveTo(-lineWidth, y);
			ctx.lineTo(width + lineWidth, y);
		}
		ctx.stroke();
	}

	ctx.restore();
}

function drawWatermark(ctx: CanvasRenderingContext2D, model: ChartModel, pane: Pane, pixelRatio: number): void {
	const options = model.options().watermark;
	if (!options.visible || options.text.length === 0) {
		return;
	}

	const width = model.timeScale().width();
	const height = pane.height();
	const lineHeight = options.fontSize * 1.2;

	ctx.save();
	ctx.scale(pixelRatio, pixelRatio);
	ctx.font = makeFont(options.fontSize);

	// make the text smaller if it is wider than the pane
	const textWidth = ctx.measureText(options.text).width;
	const zoom = textWidth > width ? width / textWidth : 1;
	const textHeight = lineHeight * zoom;

	let vertOffset = 0;
	if (options.vertAlign === 'center') {
		vertOffset = Math.max((height - textHeight) / 2, 0);
	} else if (options.vertAlign === 'bottom') {
		vertOffset = Math.max(height - textHeight, 0);
	}

	let horzOffset = lineHeight / 2;
	if (options.horzAlign === 'center') {
		horzOffset = width / 2;
	} else if (options.horzAlign === 'right') {
		horzOffset = width - 1 - lineHeight / 2;
	}

	ctx.fillStyle = options.color;
	ctx.textAlign = options.horzAlign;
	ctx.textBaseline = 'top';
	ctx.translate(horzOffset, vertOffset);
	ctx.scale(zoom, zoom);
	ctx.fillText(options.text, 0, 0);
	ctx.restore();
}

/** Calculates the coordinates of the visible bars of a series and calls the draw function of its kind. */
function drawSeries(ctx: CanvasRenderingContext2D, series: Series, timeScale: TimeScale, pixelRatio: number): void {
	const priceScale = series.priceScale();
	const store = series.store();
	if (timeScale.isEmpty() || priceScale.isEmpty() || store.length === 0) {
		return;
	}

	const visibleBars = timeScale.visibleBars();
	const firstValue = series.firstValue();
	if (visibleBars === null || firstValue === null) {
		return;
	}

	const firstBar = visibleBars.first;
	const lastBar = visibleBars.last;
	let from = store.lowerBound(firstBar);
	let to = store.lowerBound(lastBar + 1);

	if (series.kind.extendRange) {
		// a line continues to the first bar outside each edge of the pane
		if (from > 0 && from < store.length && store.timeIndexAt(from) >= firstBar) {
			from--;
		}
		if (to > 0 && to < store.length && store.timeIndexAt(to - 1) <= lastBar) {
			to++;
		}
	}

	const count = to - from;
	if (count <= 0) {
		return;
	}

	const stride = store.stride;
	if (drawData.xs.length < count) {
		drawData.xs = new Float64Array(Math.max(count, drawData.xs.length * 2));
	}
	if (drawData.ys.length < count * stride) {
		drawData.ys = new Float64Array(Math.max(count * stride, drawData.ys.length * 2));
	}

	// the same expression as TimeScale.indexToCoordinate, for the same rounding
	const xs = drawData.xs;
	const width = timeScale.width();
	const barSpacing = timeScale.barSpacing();
	const rightIndex = timeScale.baseIndex() + timeScale.rightOffset();
	const index = store.index;
	if (index === null) {
		const first = store.first + from;
		for (let i = 0; i < count; i++) {
			xs[i] = width - (rightIndex - (first + i) + 0.5) * barSpacing;
		}
	} else {
		for (let i = 0; i < count; i++) {
			xs[i] = width - (rightIndex - index[from + i] + 0.5) * barSpacing;
		}
	}

	priceScale.pricesToCoordinates(store.values, from * stride, to * stride, drawData.ys, firstValue.value);

	drawData.count = count;
	drawData.values = store.values;
	drawData.firstRow = from;
	drawData.barSpacing = barSpacing;
	drawData.pixelRatio = pixelRatio;

	ctx.save();
	series.kind.draw(ctx, drawData, series.options());
	ctx.restore();
}

/** In the percentage modes: a horizontal line at the base value of the series. */
function drawBaseLine(ctx: CanvasRenderingContext2D, series: Series, width: number, height: number, pixelRatio: number): void {
	const priceScale = series.priceScale();
	const mode = priceScale.options().mode;
	if (mode !== PriceScaleMode.Percentage && mode !== PriceScaleMode.IndexedTo100) {
		return;
	}

	const options = series.options();
	const firstValue = series.firstValue();
	if (!options.baseLineVisible || firstValue === null) {
		return;
	}

	const y = Math.round(priceScale.priceToCoordinate(firstValue.value, firstValue.value) * pixelRatio);
	if (y < 0 || y > Math.ceil(height * pixelRatio)) {
		return;
	}

	ctx.save();
	ctx.lineCap = 'butt';
	ctx.strokeStyle = options.baseLineColor;
	ctx.lineWidth = Math.max(1, Math.floor(options.baseLineWidth * pixelRatio));
	setLineStyle(ctx, options.baseLineStyle);
	const offset = strokeOffset(ctx);
	ctx.beginPath();
	ctx.moveTo(0, y + offset);
	ctx.lineTo(Math.ceil(width * pixelRatio), y + offset);
	ctx.stroke();
	ctx.restore();
}

/** The label in the pane, next to the price axis, with the title of the series. */
function drawSeriesTitleLabel(ctx: CanvasRenderingContext2D, model: ChartModel, series: Series, pixelRatio: number): void {
	const position = model.options().priceScale.position;
	const options = series.options();
	const showPriceAndPercentage = options.seriesLastValueMode === PriceAxisLastValueMode.LastPriceAndPercentageValue;
	const title = series.title();
	if (position === 'none' || (title === '' && !showPriceAndPercentage)) {
		return;
	}

	const lastValue = series.lastValue();
	if (lastValue === null) {
		return;
	}

	let text = title;
	if (options.lastValueVisible && showPriceAndPercentage) {
		text += ' ' + (series.priceScale().isPercentage() ? lastValue.formattedPriceAbsolute : lastValue.formattedPricePercentage);
	}

	const layout = model.options().layout;
	drawPriceLabel(
		ctx,
		labelMetrics(layout),
		pixelRatio,
		text.trim(),
		lastValue.coordinate,
		lastValue.color,
		contrastTextColor(ctx, lastValue.color),
		layout.backgroundColor,
		false,
		model.timeScale().width(),
		position === 'right'
	);
}

/** All static content of a pane: grid, watermark, series. The caller fills the background. */
export function drawPane(ctx: CanvasRenderingContext2D, model: ChartModel, pane: Pane, isFirstPane: boolean, pixelRatio: number): void {
	drawGrid(ctx, model, pane, pixelRatio);
	if (isFirstPane && pane.series.length !== 0) {
		drawWatermark(ctx, model, pane, pixelRatio);
	}

	const timeScale = model.timeScale();
	// the series that was added last is drawn first, below the other series
	const series = pane.series;
	for (let i = series.length - 1; i >= 0; i--) {
		if (series[i].priceScale() === pane.priceScale) {
			drawBaseLine(ctx, series[i], model.timeScale().width(), pane.height(), pixelRatio);
		}
		drawSeries(ctx, series[i], timeScale, pixelRatio);
		drawSeriesTitleLabel(ctx, model, series[i], pixelRatio);
	}
}

/** The crosshair lines and markers of one pane. */
export function drawPaneCrosshair(ctx: CanvasRenderingContext2D, model: ChartModel, pane: Pane, pixelRatio: number): void {
	const crosshair = model.crosshair();
	if (crosshair.pane === null) {
		return;
	}

	const options = model.options().crosshair;
	const x = Math.round(crosshair.x * pixelRatio);
	const y = Math.round(crosshair.y * pixelRatio);
	const w = Math.ceil(model.timeScale().width() * pixelRatio);
	const h = Math.ceil(pane.height() * pixelRatio);

	if (crosshair.visible) {
		ctx.save();
		ctx.lineCap = 'butt';

		if (options.vertLine.visible && x >= 0) {
			ctx.lineWidth = Math.max(1, Math.floor(options.vertLine.width * pixelRatio));
			ctx.strokeStyle = options.vertLine.color;
			setLineStyle(ctx, options.vertLine.style);
			const offset = strokeOffset(ctx);
			ctx.beginPath();
			ctx.moveTo(x + offset, 0);
			ctx.lineTo(x + offset, h);
			ctx.stroke();
		}

		if (options.horzLine.visible && crosshair.pane === pane && y >= 0) {
			ctx.lineWidth = Math.max(1, Math.floor(options.horzLine.width * pixelRatio));
			ctx.strokeStyle = options.horzLine.color;
			setLineStyle(ctx, options.horzLine.style);
			const offset = strokeOffset(ctx);
			ctx.beginPath();
			ctx.moveTo(0, y + offset);
			ctx.lineTo(w, y + offset);
			ctx.stroke();
		}

		ctx.restore();
	}

	// a marker on each series that has one, at the bar under the crosshair
	const backColor = model.options().layout.backgroundColor;
	const series = pane.series;
	for (let i = 0; i < series.length; i++) {
		const radius = series[i].crosshairMarkerRadius();
		if (radius === 0) {
			continue;
		}

		const store = series[i].store();
		const row = Number.isInteger(crosshair.index) ? store.rowAt(crosshair.index) : -1;
		const firstValue = row < 0 ? null : series[i].firstValue();
		if (firstValue === null) {
			continue;
		}

		const markerY = series[i].priceScale().priceToCoordinate(store.closeAt(row), firstValue.value);
		ctx.save();
		ctx.scale(pixelRatio, pixelRatio);
		ctx.fillStyle = backColor;
		ctx.beginPath();
		ctx.moveTo(crosshair.x, markerY);
		ctx.arc(crosshair.x, markerY, radius + 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = series[i].barColor(row);
		ctx.beginPath();
		ctx.moveTo(crosshair.x, markerY);
		ctx.arc(crosshair.x, markerY, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}
