// The geometry of the chart: one rectangle for each region, in CSS pixels.
// This is a pure function of sizes. It has no DOM and no canvas.

import type { PriceAxisPosition } from '../model/price-scale/price-scale';

const SEPARATOR_HEIGHT = 1;
const MIN_PANE_HEIGHT = 2;

export interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface Layout {
	width: number;
	height: number;
	/** One rectangle for each pane, from top to bottom. */
	panes: Rect[];
	/** One rectangle for each pane, or an empty array if the price axis is not visible. */
	priceAxes: Rect[];
	/** One rectangle between each two panes. It has the full width of the chart. */
	separators: Rect[];
	/** Null if the time axis is not visible. */
	timeAxis: Rect | null;
	/** The corner between the price axis and the time axis. Null if one of them is not visible. */
	corner: Rect | null;
	priceAxisPosition: PriceAxisPosition;
}

/**
 * @param stretches - relative height of each pane
 * @param priceAxisWidth - 0 if the price axis is not visible
 * @param timeAxisHeight - 0 if the time axis is not visible
 */
export function computeLayout(
	width: number,
	height: number,
	stretches: ArrayLike<number>,
	priceAxisPosition: PriceAxisPosition,
	priceAxisWidth: number,
	timeAxisHeight: number
): Layout {
	const paneCount = stretches.length;
	if (priceAxisPosition === 'none') {
		priceAxisWidth = 0;
	}

	const paneWidth = Math.max(width - priceAxisWidth, 0);
	const paneLeft = priceAxisPosition === 'left' ? priceAxisWidth : 0;
	const axisLeft = priceAxisPosition === 'left' ? 0 : paneWidth;

	let totalStretch = 0;
	for (let i = 0; i < paneCount; i++) {
		totalStretch += stretches[i];
	}

	const separatorsHeight = SEPARATOR_HEIGHT * (paneCount - 1);
	const otherHeight = separatorsHeight + timeAxisHeight;
	const totalPaneHeight = height < otherHeight ? 0 : height - otherHeight;
	const stretchPixels = totalPaneHeight / totalStretch;

	const layout: Layout = {
		width,
		height,
		panes: [],
		priceAxes: [],
		separators: [],
		timeAxis: null,
		corner: null,
		priceAxisPosition,
	};

	let top = 0;
	let accumulatedHeight = 0;
	for (let i = 0; i < paneCount; i++) {
		// the last pane takes the pixels that rounding left
		const calculated = i === paneCount - 1 ? totalPaneHeight - accumulatedHeight : Math.round(stretches[i] * stretchPixels);
		const paneHeight = Math.max(calculated, MIN_PANE_HEIGHT);
		accumulatedHeight += paneHeight;

		layout.panes.push({ left: paneLeft, top, width: paneWidth, height: paneHeight });
		if (priceAxisWidth !== 0) {
			layout.priceAxes.push({ left: axisLeft, top, width: priceAxisWidth, height: paneHeight });
		}
		top += paneHeight;

		if (i < paneCount - 1) {
			layout.separators.push({ left: 0, top, width, height: SEPARATOR_HEIGHT });
			top += SEPARATOR_HEIGHT;
		}
	}

	if (timeAxisHeight !== 0) {
		layout.timeAxis = { left: paneLeft, top, width: paneWidth, height: timeAxisHeight };
		if (priceAxisWidth !== 0) {
			layout.corner = { left: axisLeft, top, width: priceAxisWidth, height: timeAxisHeight };
		}
	}

	return layout;
}

export const enum Region {
	None = 0,
	Pane = 1,
	PriceAxis = 2,
	TimeAxis = 3,
	Separator = 4,
}

export interface HitResult {
	region: Region;
	/** Index of the pane, the price axis or the separator. */
	index: number;
	/** Position in the region, CSS pixels. */
	x: number;
	y: number;
}

function inside(rect: Rect, x: number, y: number, margin: number): boolean {
	return x >= rect.left && x < rect.left + rect.width && y >= rect.top - margin && y < rect.top + rect.height + margin;
}

function hit(out: HitResult, region: Region, index: number, rect: Rect, x: number, y: number): HitResult {
	out.region = region;
	out.index = index;
	out.x = x - rect.left;
	out.y = y - rect.top;
	return out;
}

/**
 * Finds the region at a point of the chart. Writes the result to `out`.
 * @param separatorMargin - a separator can be grabbed this number of pixels above and below it
 */
export function hitTest(layout: Layout, x: number, y: number, separatorMargin: number, out: HitResult): HitResult {
	for (let i = 0; i < layout.separators.length; i++) {
		if (inside(layout.separators[i], x, y, separatorMargin)) {
			return hit(out, Region.Separator, i, layout.separators[i], x, y);
		}
	}

	for (let i = 0; i < layout.panes.length; i++) {
		if (inside(layout.panes[i], x, y, 0)) {
			return hit(out, Region.Pane, i, layout.panes[i], x, y);
		}
	}

	for (let i = 0; i < layout.priceAxes.length; i++) {
		if (inside(layout.priceAxes[i], x, y, 0)) {
			return hit(out, Region.PriceAxis, i, layout.priceAxes[i], x, y);
		}
	}

	if (layout.timeAxis !== null && inside(layout.timeAxis, x, y, 0)) {
		return hit(out, Region.TimeAxis, 0, layout.timeAxis, x, y);
	}

	out.region = Region.None;
	out.index = -1;
	out.x = x;
	out.y = y;
	return out;
}
