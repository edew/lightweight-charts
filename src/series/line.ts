import { LineStyle, LineType, setLineStyle } from '../draw/line-style';

import type { SeriesDrawData, SeriesKind, SeriesSpec } from '../model/series-kind';
import type { LineSeriesOptions, LineSeriesPartialOptions, LineStyleOptions } from '../model/series-options';

const lineStyleDefaults: LineStyleOptions = {
	color: '#2196f3',
	lineStyle: LineStyle.Solid,
	lineWidth: 3,
	lineType: LineType.Simple,
	crosshairMarkerVisible: true,
	crosshairMarkerRadius: 4,
};

function draw(ctx: CanvasRenderingContext2D, data: SeriesDrawData, options: LineSeriesOptions): void {
	const count = data.count;
	if (count === 0) {
		return;
	}

	const xs = data.xs;
	const ys = data.ys;
	const withSteps = options.lineType === LineType.WithSteps;

	// a line is drawn in CSS pixels, so that its width follows the pixel ratio
	ctx.scale(data.pixelRatio, data.pixelRatio);

	// a square cap adds half of the line width to each end of each dash: that fills the gaps of a dotted line
	ctx.lineCap = options.lineStyle === LineStyle.Solid ? 'square' : 'butt';
	setLineStyle(ctx, options.lineStyle, options.lineWidth);
	ctx.strokeStyle = options.color;
	ctx.lineJoin = 'miter';

	ctx.beginPath();
	// a value that is not a number makes a gap: the next point starts a new part of the path
	let penDown = false;
	for (let i = 0; i < count; i++) {
		const y = ys[i];
		if (y !== y) {
			penDown = false;
			continue;
		}

		if (!penDown) {
			ctx.moveTo(xs[i], y);
			penDown = true;
			continue;
		}

		if (withSteps) {
			ctx.lineTo(xs[i], ys[i - 1]);
		}
		ctx.lineTo(xs[i], y);
	}
	ctx.stroke();
}

function range(values: Float64Array, fromRow: number, toRow: number, out: Float64Array): void {
	let min = Infinity;
	let max = -Infinity;
	for (let row = fromRow; row < toRow; row++) {
		const value = values[row];
		if (value < min) {
			min = value;
		}
		if (value > max) {
			max = value;
		}
	}
	out[0] = min;
	out[1] = max;
}

const lineKind: SeriesKind<'Line'> = {
	type: 'Line',
	stride: 1,
	defaults: lineStyleDefaults,
	extendRange: true,
	draw,
	range,
	barColor: (_values: Float64Array, _row: number, options: LineSeriesOptions) => options.color,
};

/** A line series: one value for each time point. Use with `chart.addSeries(Line({ ... }))`. */
export function Line(options: LineSeriesPartialOptions = {}): SeriesSpec<'Line'> {
	return { kind: lineKind, options };
}
