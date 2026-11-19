export type LineWidth = 1 | 2 | 3 | 4;

export enum LineType {
	Simple,
	WithSteps,
}

export enum LineStyle {
	Solid = 0,
	Dotted = 1,
	Dashed = 2,
	LargeDashed = 3,
	SparseDotted = 4,
}

/**
 * Width of a line in device pixels: a full number of pixels, and at least one.
 * @param width - width in CSS pixels
 */
export function hairline(pixelRatio: number, width: number = 1): number {
	return Math.max(1, Math.floor(width * pixelRatio));
}

const noDash: number[] = [];
// the canvas copies the pattern, so one array is sufficient for all calls
const dash: number[] = [0, 0];

/**
 * Sets the width and the dash pattern of the lines that are stroked after this call.
 *
 * @param lineWidth - in the units of the context
 * @returns the offset that puts a line of this width on full pixels: 0.5 for an odd width
 */
export function setLineStyle(ctx: CanvasRenderingContext2D, style: LineStyle, lineWidth: number): number {
	ctx.lineWidth = lineWidth;
	if (style === LineStyle.Solid) {
		ctx.setLineDash(noDash);
	} else {
		const length = style === LineStyle.Dashed ? 2 : style === LineStyle.LargeDashed ? 6 : 1;
		dash[0] = length * lineWidth;
		dash[1] = (style === LineStyle.SparseDotted ? 4 : length) * lineWidth;
		ctx.setLineDash(dash);
	}
	return (lineWidth % 2) ? 0.5 : 0;
}
