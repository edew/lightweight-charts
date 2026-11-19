// Draws the full chart on two canvases: a static one (background, grid, series, axes)
// and an overlay (crosshair). This file and the files it imports have no DOM code,
// so the chart can be drawn in tests with any canvas implementation.

import { type ChartModel, InvalidationLevel } from '../model/chart-model';

import { computeLayout, type Layout, type Rect } from './layout';
import { drawPane, drawPaneCrosshair } from './pane';
import { drawPriceAxis, drawPriceAxisCrosshair, priceAxisOptimalWidth } from './price-axis';
import { drawTimeAxis, drawTimeAxisCrosshair, timeAxisHeight } from './time-axis';

const stretches: number[] = [];
const paneHeights: number[] = [];

/**
 * Calculates the layout for a chart size and gives the pane sizes to the model.
 *
 * The width of the price axis depends on its labels, the labels depend on the price
 * range, and the range depends on the visible bars, which depend on the pane width.
 * So this function measures, applies the sizes, and measures one more time.
 *
 * @param ctx - any context of the chart, to measure text
 * @param minPriceAxisWidth - the axis does not get narrower than this (0 for no limit)
 */
export function layoutChart(ctx: CanvasRenderingContext2D, model: ChartModel, width: number, height: number, minPriceAxisWidth: number): Layout {
	const panes = model.panes();
	stretches.length = panes.length;
	for (let i = 0; i < panes.length; i++) {
		stretches[i] = panes[i].stretch;
	}

	const position = model.options().priceScale.position;
	const axisHeight = timeAxisHeight(model);

	let layout: Layout | null = null;
	let axisWidth = minPriceAxisWidth;
	for (let pass = 0; pass < 2; pass++) {
		if (position !== 'none') {
			const optimal = Math.max(minPriceAxisWidth, priceAxisOptimalWidth(ctx, model));
			if (layout !== null && optimal === axisWidth) {
				break;
			}
			axisWidth = optimal;
		} else if (layout !== null) {
			break;
		}

		layout = computeLayout(width, height, stretches, position, axisWidth, axisHeight);
		paneHeights.length = panes.length;
		for (let i = 0; i < panes.length; i++) {
			paneHeights[i] = layout.panes[i].height;
		}
		model.setSize(layout.panes[0].width, paneHeights);
	}

	return layout as Layout;
}

/**
 * The first step of a frame above the Cursor level: applies the requests of the model
 * and calculates the layout. The caller sets the canvas sizes, then calls `drawFrame()`.
 *
 * @param previous - the layout of the last frame, or null for the first frame
 */
export function prepareFrame(ctx: CanvasRenderingContext2D, model: ChartModel, width: number, height: number, level: InvalidationLevel, previous: Layout | null): Layout {
	model.applyRequests();
	// between full updates the price axis only grows, so that it does not jump during a scroll
	const minAxisWidth = level === InvalidationLevel.Full || previous === null || previous.priceAxes.length === 0 ? 0 : previous.priceAxes[0].width;
	return layoutChart(ctx, model, width, height, minAxisWidth);
}

/**
 * The second step of a frame: calculates the crosshair and draws. A Cursor frame draws
 * only the overlay. With one context for the two parameters, the crosshair is drawn on
 * the static content.
 *
 * @returns true if the crosshair changed
 */
export function drawFrame(staticCtx: CanvasRenderingContext2D, overlayCtx: CanvasRenderingContext2D, model: ChartModel, layout: Layout, pixelRatio: number, level: InvalidationLevel): boolean {
	// one calculation of the crosshair for each frame
	const crosshairChanged = model.resolveCrosshair();

	if (level > InvalidationLevel.Cursor) {
		drawStatic(staticCtx, model, layout, pixelRatio);
	}

	if (overlayCtx !== staticCtx) {
		overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
	}
	drawOverlay(overlayCtx, model, layout, pixelRatio);
	return crosshairChanged;
}

function beginRegion(ctx: CanvasRenderingContext2D, rect: Rect, pixelRatio: number): void {
	ctx.save();
	ctx.translate(Math.round(rect.left * pixelRatio), Math.round(rect.top * pixelRatio));
	ctx.beginPath();
	ctx.rect(0, 0, Math.ceil(rect.width * pixelRatio), Math.ceil(rect.height * pixelRatio));
	ctx.clip();
}

/** Draws all content that changes only with data, scales or options. */
function drawStatic(ctx: CanvasRenderingContext2D, model: ChartModel, layout: Layout, pixelRatio: number): void {
	const options = model.options();
	const panes = model.panes();

	ctx.fillStyle = options.layout.backgroundColor;
	ctx.fillRect(0, 0, Math.ceil(layout.width * pixelRatio), Math.ceil(layout.height * pixelRatio));

	for (let i = 0; i < panes.length; i++) {
		beginRegion(ctx, layout.panes[i], pixelRatio);
		drawPane(ctx, model, panes[i], i === 0, pixelRatio);
		ctx.restore();

		if (layout.priceAxes.length !== 0) {
			beginRegion(ctx, layout.priceAxes[i], pixelRatio);
			drawPriceAxis(ctx, model, panes[i], layout.priceAxes[i].width, pixelRatio);
			ctx.restore();
		}
	}

	for (let i = 0; i < layout.separators.length; i++) {
		const rect = layout.separators[i];
		ctx.fillStyle = options.timeScale.borderColor;
		ctx.fillRect(
			0,
			Math.round(rect.top * pixelRatio),
			Math.ceil(rect.width * pixelRatio),
			Math.max(1, Math.round(rect.height * pixelRatio))
		);
	}

	if (layout.timeAxis !== null) {
		beginRegion(ctx, layout.timeAxis, pixelRatio);
		drawTimeAxis(ctx, model, layout.timeAxis.width, pixelRatio);
		ctx.restore();

		// the corner continues the border of the two axes
		if (layout.corner !== null && options.priceScale.borderVisible && options.timeScale.borderVisible) {
			const corner = layout.corner;
			const borderSize = Math.max(1, Math.floor(pixelRatio));
			const left = layout.priceAxisPosition === 'left'
				? Math.round((corner.left + corner.width) * pixelRatio) - borderSize
				: Math.round(corner.left * pixelRatio);
			ctx.fillStyle = options.timeScale.borderColor;
			ctx.fillRect(left, Math.round(corner.top * pixelRatio), borderSize, borderSize);
		}
	}
}

/** Draws the crosshair: lines, markers and the labels on the axes. */
function drawOverlay(ctx: CanvasRenderingContext2D, model: ChartModel, layout: Layout, pixelRatio: number): void {
	if (model.crosshair().pane === null) {
		return;
	}

	const panes = model.panes();
	for (let i = 0; i < panes.length; i++) {
		beginRegion(ctx, layout.panes[i], pixelRatio);
		drawPaneCrosshair(ctx, model, panes[i], pixelRatio);
		ctx.restore();

		if (layout.priceAxes.length !== 0) {
			beginRegion(ctx, layout.priceAxes[i], pixelRatio);
			drawPriceAxisCrosshair(ctx, model, panes[i], layout.priceAxes[i].width, pixelRatio);
			ctx.restore();
		}
	}

	if (layout.timeAxis !== null) {
		beginRegion(ctx, layout.timeAxis, pixelRatio);
		drawTimeAxisCrosshair(ctx, model, layout.timeAxis.width, pixelRatio);
		ctx.restore();
	}
}
