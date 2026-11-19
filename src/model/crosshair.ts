import type { LineStyle, LineWidth } from '../draw/line-style';

import type { Pane } from './pane';
import type { TimePointIndex } from './time-scale/time-data';

/**
 * Enum of possible crosshair behavior modes.
 * Normal means that the crosshair always follows the pointer.
 * Magnet means that the vertical line of the crosshair follows the pointer, while the horizontal line is placed on the corresponding series point.
 */
export enum CrosshairMode {
	Normal,
	Magnet,
}

/** Structure describing a crosshair line (vertical or horizontal) */
export interface CrosshairLineOptions {
	/** Color of a certain crosshair line */
	color: string;
	/** Width of a certain crosshair line and corresponding scale label */
	width: LineWidth;
	/** Style of a certain crosshair line */
	style: LineStyle;
	/** Visibility of a certain crosshair line */
	visible: boolean;
	/** Visibility of corresponding scale label */
	labelVisible: boolean;
	/** Background color of corresponding scale label */
	labelBackgroundColor: string;
}

/** Structure describing crosshair options  */
export interface CrosshairOptions {
	/** Crosshair mode */
	mode: CrosshairMode;
	/** Options of the crosshair vertical line */
	vertLine: CrosshairLineOptions;
	/** Options of the crosshair horizontal line */
	horzLine: CrosshairLineOptions;
}

/**
 * State of the crosshair. `ChartModel.resolveCrosshair()` calculates the fields below
 * the origin from the origin, one time for each frame.
 */
export interface Crosshair {
	/** The pane under the pointer, or null when there is no crosshair. */
	pane: Pane | null;
	/** Pointer position in the pane, CSS pixels. */
	originX: number;
	originY: number;
	/** Time index under the pointer. NaN when there is no data. */
	index: TimePointIndex;
	/** Price under the pointer on the price scale of the pane. */
	price: number;
	/** x of the center of the bar at `index`, CSS pixels. */
	x: number;
	/** y of `price`, CSS pixels in the pane. */
	y: number;
}

export function createCrosshair(): Crosshair {
	return {
		pane: null,
		originX: NaN,
		originY: NaN,
		index: NaN as TimePointIndex,
		price: NaN,
		x: NaN,
		y: NaN,
	};
}
