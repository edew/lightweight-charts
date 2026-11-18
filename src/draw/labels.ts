// Shared code for the text labels on the axes.

import { makeFont } from '../helpers/make-font';

import type { LayoutOptions } from '../model/layout-options';
import { TextWidthCache } from '../model/text-width-cache';

const BORDER_SIZE = 1;
const PRICE_TICK_LENGTH = 4;
const TIME_TICK_LENGTH = 3;

/** Sizes that depend on the font. They change only when the layout options change. */
export interface LabelMetrics {
	font: string;
	boldFont: string;
	fontSize: number;
	borderSize: number;
	// price axis
	priceTickLength: number;
	pricePaddingTop: number;
	pricePaddingBottom: number;
	pricePaddingInner: number;
	pricePaddingOuter: number;
	priceBaselineOffset: number;
	/** Height of a label on the price axis. */
	priceLabelHeight: number;
	// time axis
	timeTickLength: number;
	timePaddingTop: number;
	timePaddingBottom: number;
	timePaddingHorizontal: number;
	timeBaselineOffset: number;
	timeAxisHeight: number;
}

let cachedMetrics: LabelMetrics | null = null;
let cachedFontSize = NaN;
let cachedFontFamily = '';

/** Text widths for the font of the last `labelMetrics()` result. */
export const textWidthCache = new TextWidthCache(200);

export function labelMetrics(layout: LayoutOptions): LabelMetrics {
	if (cachedMetrics !== null && cachedFontSize === layout.fontSize && cachedFontFamily === layout.fontFamily) {
		return cachedMetrics;
	}

	const fontSize = layout.fontSize;
	cachedFontSize = fontSize;
	cachedFontFamily = layout.fontFamily;
	textWidthCache.reset();

	const pricePadding = Math.floor(fontSize / 3.5);
	const timePadding = Math.ceil(fontSize / 2.5);

	cachedMetrics = {
		font: makeFont(fontSize, layout.fontFamily),
		boldFont: makeFont(fontSize, layout.fontFamily, 'bold'),
		fontSize,
		borderSize: BORDER_SIZE,
		priceTickLength: PRICE_TICK_LENGTH,
		pricePaddingTop: pricePadding,
		pricePaddingBottom: pricePadding,
		pricePaddingInner: Math.max(Math.ceil(fontSize / 2 - PRICE_TICK_LENGTH / 2), 0),
		pricePaddingOuter: Math.ceil(fontSize / 2 + PRICE_TICK_LENGTH / 2),
		priceBaselineOffset: Math.round(fontSize / 10),
		priceLabelHeight: fontSize + pricePadding * 2,
		timeTickLength: TIME_TICK_LENGTH,
		timePaddingTop: timePadding,
		timePaddingBottom: timePadding,
		timePaddingHorizontal: Math.ceil(fontSize / 2),
		timeBaselineOffset: Math.round(fontSize / 5),
		timeAxisHeight: Math.ceil(BORDER_SIZE + TIME_TICK_LENGTH + fontSize + timePadding * 2),
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

	const tickSize = tickVisible ? metrics.priceTickLength : 0;
	const horzBorder = metrics.borderSize;
	const textWidth = Math.ceil(textWidthCache.measureText(ctx, text));
	const totalHeight = metrics.priceLabelHeight;
	const halfHeight = Math.ceil(totalHeight * 0.5);
	const totalWidth = horzBorder + textWidth + metrics.pricePaddingInner + metrics.pricePaddingOuter + tickSize;

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

	const tickHeight = Math.max(1, Math.floor(pixelRatio));
	const horzBorderScaled = Math.max(1, Math.floor(horzBorder * pixelRatio));
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
	ctx.fillText(text, xText, yBottom - metrics.pricePaddingBottom - metrics.priceBaselineOffset);
	ctx.restore();
}
