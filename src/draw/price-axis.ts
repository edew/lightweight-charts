// Draw functions for the price axis of one pane. The origin of the context is the
// top left corner of the axis, in device pixels.

import type { ChartModel } from '../model/chart-model';
import type { Pane } from '../model/pane';
import type { Series } from '../model/series';
import { PriceAxisLastValueMode } from '../model/series-options';

import { contrastTextColor, drawPriceLabel, type LabelMetrics, LabelSize, labelMetrics, textWidth } from './labels';
import { hairline } from './line-style';

interface AxisLabel {
	text: string;
	/** y of the price. */
	coordinate: number;
	/** y of the label after alignment. */
	fixedCoordinate: number;
	color: string;
}

// reused between frames
const labels: AxisLabel[] = [];
let labelCount = 0;

function axisText(series: Series, text: string, absolute: string, percentage: string): string {
	const options = series.options();
	if (!options.lastValueVisible) {
		return '';
	}
	if (options.seriesLastValueMode !== PriceAxisLastValueMode.LastPriceAndPercentageValue) {
		return text;
	}
	return series.priceScale().isPercentage() ? percentage : absolute;
}

/** Collects the last-value labels of the series of a pane into `labels`. */
function collectLabels(pane: Pane): void {
	labelCount = 0;
	const series = pane.series;
	for (let i = 0; i < series.length; i++) {
		const lastValue = series[i].lastValue();
		if (lastValue === null) {
			continue;
		}

		const text = axisText(series[i], lastValue.text, lastValue.formattedPriceAbsolute, lastValue.formattedPricePercentage);
		if (text.length === 0) {
			continue;
		}

		if (labelCount === labels.length) {
			labels.push({ text: '', coordinate: 0, fixedCoordinate: 0, color: '' });
		}
		const label = labels[labelCount++];
		label.text = text;
		label.coordinate = lastValue.coordinate;
		label.fixedCoordinate = lastValue.coordinate;
		label.color = lastValue.color;
	}
}

/**
 * Moves labels that overlap away from each other. The label of the first series
 * that is on the scale of the axis stays at its place; the other labels move up or down.
 */
function alignLabels(pane: Pane, labelHeight: number): void {
	if (labelCount < 2) {
		return;
	}

	// sort by coordinate (insertion sort: there are only some labels)
	for (let i = 1; i < labelCount; i++) {
		const label = labels[i];
		let j = i - 1;
		while (j >= 0 && labels[j].coordinate > label.coordinate) {
			labels[j + 1] = labels[j];
			j--;
		}
		labels[j + 1] = label;
	}

	// the label nearest to the center of the pane does not move
	const center = pane.height() / 2;
	let anchor = 0;
	for (let i = 1; i < labelCount; i++) {
		if (Math.abs(labels[i].coordinate - center) < Math.abs(labels[anchor].coordinate - center)) {
			anchor = i;
		}
	}

	for (let i = anchor - 1; i >= 0; i--) {
		const limit = labels[i + 1].fixedCoordinate - labelHeight;
		if (labels[i].coordinate > limit) {
			labels[i].fixedCoordinate = limit;
		}
	}

	for (let i = anchor + 1; i < labelCount; i++) {
		const limit = labels[i - 1].fixedCoordinate + labelHeight;
		if (labels[i].coordinate < limit) {
			labels[i].fixedCoordinate = limit;
		}
	}
}

/** The width that the price axis needs for its tick labels and its last-value labels, CSS pixels. */
export function priceAxisOptimalWidth(ctx: CanvasRenderingContext2D, model: ChartModel): number {
	const metrics = labelMetrics(model.options().layout);
	ctx.font = metrics.font;

	// a reasonable value while there is no data
	let maxTextWidth = 34;
	let measured = false;

	const panes = model.panes();
	for (let p = 0; p < panes.length; p++) {
		const marks = panes[p].priceScale.marks();
		if (marks.length > 0) {
			const width = Math.max(
				textWidth(ctx, marks[0].label),
				textWidth(ctx, marks[marks.length - 1].label)
			);
			maxTextWidth = measured ? Math.max(maxTextWidth, width) : width;
			measured = true;
		}

		collectLabels(panes[p]);
		for (let i = 0; i < labelCount; i++) {
			maxTextWidth = Math.max(maxTextWidth, textWidth(ctx, labels[i].text));
		}
	}

	return Math.ceil(
		LabelSize.Border +
		LabelSize.PriceTick +
		metrics.pricePaddingInner +
		metrics.pricePaddingOuter +
		maxTextWidth
	);
}

/** The static part: border, tick marks with their text, and the last-value labels of the series. */
export function drawPriceAxis(ctx: CanvasRenderingContext2D, model: ChartModel, pane: Pane, width: number, pixelRatio: number): void {
	const options = model.options();
	const metrics = labelMetrics(options.layout);
	const priceScale = pane.priceScale;
	const isLeft = options.priceScale.position === 'left';
	const borderVisible = priceScale.options().borderVisible;
	const borderColor = priceScale.options().borderColor;
	const bitmapWidth = Math.ceil(width * pixelRatio);

	if (borderVisible) {
		ctx.fillStyle = borderColor;
		const borderSize = hairline(pixelRatio, LabelSize.Border);
		ctx.fillRect(isLeft ? bitmapWidth - borderSize : 0, 0, borderSize, Math.ceil(pane.height() * pixelRatio));
	}

	const marks = priceScale.marks();
	if (marks.length !== 0) {
		const tickLeft = isLeft
			? Math.floor((width - LabelSize.PriceTick) * pixelRatio - LabelSize.Border * pixelRatio)
			: Math.floor(LabelSize.Border * pixelRatio);

		if (borderVisible) {
			const tickHeight = hairline(pixelRatio);
			const tickOffset = Math.floor(pixelRatio * 0.5);
			const tickLength = Math.round(LabelSize.PriceTick * pixelRatio);
			ctx.fillStyle = borderColor;
			for (let i = 0; i < marks.length; i++) {
				ctx.fillRect(tickLeft, Math.round(marks[i].coord * pixelRatio) - tickOffset, tickLength, tickHeight);
			}
		}

		// the text is drawn in CSS pixels; the middle of the text is at the tick
		const textX = isLeft
			? tickLeft / pixelRatio - metrics.pricePaddingInner
			: tickLeft / pixelRatio + LabelSize.PriceTick + metrics.pricePaddingInner;
		ctx.save();
		ctx.scale(pixelRatio, pixelRatio);
		ctx.font = metrics.font;
		ctx.fillStyle = options.layout.textColor;
		ctx.textAlign = isLeft ? 'right' : 'left';
		ctx.textBaseline = 'middle';
		for (let i = 0; i < marks.length; i++) {
			ctx.fillText(marks[i].label, textX, Math.round(marks[i].coord * pixelRatio) / pixelRatio);
		}
		ctx.restore();
	}

	collectLabels(pane);
	if (priceScale.options().alignLabels) {
		alignLabels(pane, metrics.priceLabelHeight);
	}
	for (let i = 0; i < labelCount; i++) {
		const label = labels[i];
		drawAxisLabel(ctx, metrics, pixelRatio, label.text, label.fixedCoordinate, label.color, width, isLeft);
	}
}

function drawAxisLabel(
	ctx: CanvasRenderingContext2D,
	metrics: LabelMetrics,
	pixelRatio: number,
	text: string,
	coordinate: number,
	background: string,
	width: number,
	isLeft: boolean
): void {
	// on the axis the inner side of the label is the side of the pane
	drawPriceLabel(ctx, metrics, pixelRatio, text, coordinate, background, contrastTextColor(ctx, background), background, true, width, isLeft);
}

/** The overlay part: the label with the price under the crosshair. */
export function drawPriceAxisCrosshair(ctx: CanvasRenderingContext2D, model: ChartModel, pane: Pane, width: number, pixelRatio: number): void {
	const crosshair = model.crosshair();
	const options = model.options();
	const lineOptions = options.crosshair.horzLine;
	if (crosshair.pane !== pane || !lineOptions.labelVisible) {
		return;
	}

	const priceScale = pane.priceScale;
	const firstValue = priceScale.isEmpty() ? null : priceScale.firstValue();
	if (firstValue === null || crosshair.price !== crosshair.price) {
		return;
	}

	drawAxisLabel(
		ctx,
		labelMetrics(options.layout),
		pixelRatio,
		priceScale.formatPrice(crosshair.price, firstValue),
		crosshair.y,
		lineOptions.labelBackgroundColor,
		width,
		options.priceScale.position === 'left'
	);
}
