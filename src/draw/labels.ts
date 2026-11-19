// Shared code for the text labels on the axes.

import { makeFont } from '../helpers/make-font';

import type { LayoutOptions } from '../model/layout-options';

import { hairline } from './line-style';

/** Sizes that do not depend on the font, CSS pixels. */
export const enum LabelSize {
	/** Width of the border line of an axis. */
	Border = 1,
	PriceTick = 4,
	TimeTick = 3,
}

/** Sizes that depend on the font. They change only when the layout options change. */
export interface LabelMetrics {
	font: string;
	boldFont: string;
	fontSize: number;
	// price axis
	/** Space above and below the text of a label. */
	pricePadding: number;
	pricePaddingInner: number;
	pricePaddingOuter: number;
	priceBaselineOffset: number;
	/** Height of a label on the price axis. */
	priceLabelHeight: number;
	// time axis
	/** Space above and below the text. */
	timePadding: number;
	timePaddingHorizontal: number;
	timeBaselineOffset: number;
	timeAxisHeight: number;
}

let cachedMetrics: LabelMetrics | null = null;
let cachedFontSize = NaN;
let cachedFontFamily = '';

// text widths for the font of the last `labelMetrics()` result
const textWidths = new Map<string, number>();

/**
 * Width of a text in the font of the context. Digits are replaced with "0" before a
 * measurement, so that all prices with the same number of digits have the same width
 * and need one measurement.
 */
export function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
	let width = textWidths.get(text);
	if (width === undefined) {
		const key = text.replace(/[2-9]/g, '0');
		width = textWidths.get(key);
		if (width === undefined) {
			width = ctx.measureText(key).width;
			if (width === 0) {
				// Firefox can give 0 for a canvas with no size: do not keep it
				return 0;
			}
			if (textWidths.size > 500) {
				textWidths.clear();
			}
			textWidths.set(key, width);
		}
		textWidths.set(text, width);
	}
	return width;
}

export function labelMetrics(layout: LayoutOptions): LabelMetrics {
	if (cachedMetrics !== null && cachedFontSize === layout.fontSize && cachedFontFamily === layout.fontFamily) {
		return cachedMetrics;
	}

	const fontSize = layout.fontSize;
	cachedFontSize = fontSize;
	cachedFontFamily = layout.fontFamily;
	textWidths.clear();

	const pricePadding = Math.floor(fontSize / 3.5);
	const timePadding = Math.ceil(fontSize / 2.5);

	cachedMetrics = {
		font: makeFont(fontSize, layout.fontFamily),
		boldFont: makeFont(fontSize, layout.fontFamily, 'bold'),
		fontSize,
		pricePadding,
		pricePaddingInner: Math.max(Math.ceil(fontSize / 2 - LabelSize.PriceTick / 2), 0),
		pricePaddingOuter: Math.ceil(fontSize / 2 + LabelSize.PriceTick / 2),
		priceBaselineOffset: Math.round(fontSize / 10),
		priceLabelHeight: fontSize + pricePadding * 2,
		timePadding,
		timePaddingHorizontal: Math.ceil(fontSize / 2),
		timeBaselineOffset: Math.round(fontSize / 5),
		timeAxisHeight: Math.ceil(LabelSize.Border + LabelSize.TimeTick + fontSize + timePadding * 2),
	};
	return cachedMetrics;
}

const textColorCache = new Map<string, { opaque: string; text: string }>();

function parsedColor(ctx: CanvasRenderingContext2D, color: string): { opaque: string; text: string } {
	let result = textColorCache.get(color);
	if (result !== undefined) {
		return result;
	}

	// the canvas normalizes a color to "#rrggbb" or "rgba(r, g, b, a)"
	const saved = ctx.fillStyle;
	ctx.fillStyle = '#000';
	ctx.fillStyle = color;
	const normalized = ctx.fillStyle as string;
	ctx.fillStyle = saved;

	let r = 0;
	let g = 0;
	let b = 0;
	if (normalized.charAt(0) === '#') {
		r = parseInt(normalized.slice(1, 3), 16);
		g = parseInt(normalized.slice(3, 5), 16);
		b = parseInt(normalized.slice(5, 7), 16);
	} else {
		const parts = normalized.slice(normalized.indexOf('(') + 1).split(',');
		r = parseInt(parts[0], 10);
		g = parseInt(parts[1], 10);
		b = parseInt(parts[2], 10);
	}

	// luminance of the color decides between black and white text
	const gray = 0.199 * r + 0.687 * g + 0.114 * b;
	result = {
		opaque: `rgb(${r}, ${g}, ${b})`,
		text: gray >= 160 ? 'black' : 'white',
	};
	if (textColorCache.size > 100) {
		textColorCache.clear();
	}
	textColorCache.set(color, result);
	return result;
}

/** Black or white, which one has more contrast on the background color. */
export function contrastTextColor(ctx: CanvasRenderingContext2D, background: string): string {
	return parsedColor(ctx, background).text;
}

/** The color with no transparency. */
function opaqueColor(ctx: CanvasRenderingContext2D, color: string): string {
	return parsedColor(ctx, color).opaque;
}

/**
 * Draws a price label: a filled box with text, as on the price axis for the last value
 * of a series and for the crosshair.
 *
 * @param width - width of the region, CSS pixels. The label is at the side of the pane.
 * @param alignRight - true if the inner side of the label is the right side of the region
 * @param tickVisible - draws the small tick between the pane and the text
 */
export function drawPriceLabel(
	ctx: CanvasRenderingContext2D,
	metrics: LabelMetrics,
	pixelRatio: number,
	text: string,
	coordinate: number,
	background: string,
	textColor: string,
	borderColor: string,
	tickVisible: boolean,
	width: number,
	alignRight: boolean
): void {
	if (text.length === 0) {
		return;
	}

	ctx.font = metrics.font;

	const tickSize = tickVisible ? LabelSize.PriceTick : 0;
	const horzBorder = LabelSize.Border;
	const labelTextWidth = Math.ceil(textWidth(ctx, text));
	const totalHeight = metrics.priceLabelHeight;
	const halfHeight = Math.ceil(totalHeight * 0.5);
	const totalWidth = horzBorder + labelTextWidth + metrics.pricePaddingInner + metrics.pricePaddingOuter + tickSize;

	const yMid = Math.round(coordinate);
	const yTop = yMid - halfHeight;
	const yBottom = yTop + totalHeight;

	const xInside = alignRight ? width : 0;
	const rightScaled = Math.ceil(width * pixelRatio);

	let xOutside: number;
	let xTick: number;
	let xText: number;
	if (alignRight) {
		xOutside = xInside - totalWidth;
		xTick = xInside - tickSize;
		xText = xOutside + metrics.pricePaddingOuter;
	} else {
		xOutside = xInside + totalWidth;
		xTick = xInside + tickSize;
		xText = xInside + horzBorder + tickSize + metrics.pricePaddingInner;
	}

	const tickHeight = hairline(pixelRatio);
	const horzBorderScaled = hairline(pixelRatio, horzBorder);
	const xInsideScaled = alignRight ? rightScaled : 0;
	const yTopScaled = Math.round(yTop * pixelRatio);
	const xOutsideScaled = Math.round(xOutside * pixelRatio);
	const yMidScaled = Math.round(yMid * pixelRatio) - Math.floor(pixelRatio * 0.5);
	const yBottomScaled = yMidScaled + tickHeight + (yMidScaled - yTopScaled);
	const xTickScaled = Math.round(xTick * pixelRatio);

	ctx.fillStyle = opaqueColor(ctx, background);
	ctx.fillRect(
		Math.min(xInsideScaled, xOutsideScaled),
		yTopScaled,
		Math.abs(xOutsideScaled - xInsideScaled),
		yBottomScaled - yTopScaled
	);

	ctx.fillStyle = borderColor;
	ctx.fillRect(alignRight ? rightScaled - horzBorderScaled : 0, yTopScaled, horzBorderScaled, yBottomScaled - yTopScaled);

	ctx.fillStyle = textColor;
	if (tickVisible) {
		ctx.fillRect(Math.min(xInsideScaled, xTickScaled), yMidScaled, Math.abs(xTickScaled - xInsideScaled), tickHeight);
	}

	ctx.textAlign = 'left';
	ctx.save();
	ctx.scale(pixelRatio, pixelRatio);
	ctx.fillText(text, xText, yBottom - metrics.pricePadding - metrics.priceBaselineOffset);
	ctx.restore();
}
