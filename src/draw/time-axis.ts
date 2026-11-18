// Draw functions for the time axis. The origin of the context is the top left corner
// of the axis, in device pixels.

import type { ChartModel } from '../model/chart-model';

import { contrastTextColor, LabelSize, labelMetrics, textWidth } from './labels';

/** Height of the time axis in CSS pixels, or 0 if it is not visible. */
export function timeAxisHeight(model: ChartModel): number {
	return model.options().timeScale.visible ? labelMetrics(model.options().layout).timeAxisHeight : 0;
}

/** The static part: border, tick marks and their text. */
export function drawTimeAxis(ctx: CanvasRenderingContext2D, model: ChartModel, width: number, pixelRatio: number): void {
	const options = model.options();
	const metrics = labelMetrics(options.layout);
	const borderVisible = options.timeScale.borderVisible;
	const borderColor = options.timeScale.borderColor;

	if (borderVisible) {
		ctx.fillStyle = borderColor;
		ctx.fillRect(0, 0, Math.ceil(width * pixelRatio), Math.max(1, Math.floor(LabelSize.Border * pixelRatio)));
	}

	const marks = model.timeScale().marks();
	if (marks === null || marks.length === 0) {
		return;
	}

	// the marks with the highest weight are bold
	let maxSpan = 0;
	for (let i = 0; i < marks.length; i++) {
		if (marks[i].span > maxSpan) {
			maxSpan = marks[i].span;
		}
	}
	// it looks strange if 15:00 is bold but 14:00 is not: all hour steps have the same style
	if (maxSpan > 30 && maxSpan < 40) {
		maxSpan = 30;
	}

	if (borderVisible) {
		const borderSize = Math.floor(LabelSize.Border * pixelRatio);
		const tickWidth = Math.max(1, Math.floor(pixelRatio));
		const tickOffset = Math.floor(pixelRatio * 0.5);
		const tickLength = Math.round(LabelSize.TimeTick * pixelRatio);
		ctx.fillStyle = borderColor;
		for (let i = 0; i < marks.length; i++) {
			ctx.fillRect(Math.round(marks[i].coord * pixelRatio) - tickOffset, borderSize, tickWidth, tickLength);
		}
	}

	const yText = LabelSize.Border + LabelSize.TimeTick + metrics.timePadding + metrics.fontSize - metrics.timeBaselineOffset;

	ctx.save();
	ctx.scale(pixelRatio, pixelRatio);
	ctx.textAlign = 'center';
	ctx.fillStyle = options.layout.textColor;

	ctx.font = metrics.font;
	for (let i = 0; i < marks.length; i++) {
		if (marks[i].span < maxSpan) {
			ctx.fillText(marks[i].label, marks[i].coord, yText);
		}
	}

	ctx.font = metrics.boldFont;
	for (let i = 0; i < marks.length; i++) {
		if (marks[i].span >= maxSpan) {
			ctx.fillText(marks[i].label, marks[i].coord, yText);
		}
	}
	ctx.restore();
}

/** The overlay part: the label with the time under the crosshair. */
export function drawTimeAxisCrosshair(ctx: CanvasRenderingContext2D, model: ChartModel, width: number, pixelRatio: number): void {
	const crosshair = model.crosshair();
	const options = model.options();
	const lineOptions = options.crosshair.vertLine;
	const timeScale = model.timeScale();
	if (!crosshair.visible || !lineOptions.labelVisible || timeScale.isEmpty()) {
		return;
	}

	const time = timeScale.indexToTime(crosshair.index);
	if (time === null) {
		return;
	}

	const metrics = labelMetrics(options.layout);
	const text = timeScale.formatDateTime(time);
	ctx.font = metrics.font;
	const labelTextWidth = Math.round(textWidth(ctx, text));
	if (labelTextWidth <= 0) {
		return;
	}

	const horzMargin = metrics.timePaddingHorizontal;
	const labelWidth = labelTextWidth + 2 * horzMargin;
	const labelWidthHalf = labelWidth / 2;

	// keep the label inside the axis
	let coordinate = crosshair.x;
	let x1 = Math.floor(coordinate - labelWidthHalf) + 0.5;
	if (x1 < 0) {
		coordinate = coordinate + Math.abs(0 - x1);
		x1 = Math.floor(coordinate - labelWidthHalf) + 0.5;
	} else if (x1 + labelWidth > width) {
		coordinate = coordinate - Math.abs(width - (x1 + labelWidth));
		x1 = Math.floor(coordinate - labelWidthHalf) + 0.5;
	}

	const x2 = x1 + labelWidth;
	const y2 = LabelSize.Border + metrics.timePadding + metrics.fontSize + metrics.timePadding;

	const x1scaled = Math.round(x1 * pixelRatio);
	const x2scaled = Math.round(x2 * pixelRatio);
	const y2scaled = Math.round(y2 * pixelRatio);

	ctx.fillStyle = lineOptions.labelBackgroundColor;
	ctx.fillRect(x1scaled, 0, x2scaled - x1scaled, y2scaled);

	const textColor = contrastTextColor(ctx, lineOptions.labelBackgroundColor);
	const tickWidth = Math.max(1, Math.floor(pixelRatio));
	const tickOffset = Math.floor(pixelRatio * 0.5);
	ctx.fillStyle = textColor;
	ctx.fillRect(
		Math.round(crosshair.x * pixelRatio) - tickOffset,
		0,
		tickWidth,
		Math.round((LabelSize.Border + LabelSize.TimeTick) * pixelRatio)
	);

	ctx.save();
	ctx.scale(pixelRatio, pixelRatio);
	ctx.textAlign = 'left';
	ctx.fillText(text, x1 + horzMargin, y2 - metrics.timeBaselineOffset - metrics.timePadding);
	ctx.restore();
}
