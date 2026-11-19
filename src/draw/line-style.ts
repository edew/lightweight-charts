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

export function setLineStyle(ctx: CanvasRenderingContext2D, style: LineStyle): void {
	const dashPatterns = {
		[LineStyle.Solid]: [],
		[LineStyle.Dotted]: [ctx.lineWidth, ctx.lineWidth],
		[LineStyle.Dashed]: [2 * ctx.lineWidth, 2 * ctx.lineWidth],
		[LineStyle.LargeDashed]: [6 * ctx.lineWidth, 6 * ctx.lineWidth],
		[LineStyle.SparseDotted]: [ctx.lineWidth, 4 * ctx.lineWidth],
	};

	const dashPattern = dashPatterns[style];
	ctx.setLineDash(dashPattern);
}
