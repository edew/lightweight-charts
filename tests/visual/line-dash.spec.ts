import { expect } from 'chai';
import { describe, it } from 'vitest';

import type { LineData } from '../../src/api/data-consumer';
import { LineStyle, type LineWidth } from '../../src/draw/line-style';
import type { UTCTimestamp } from '../../src/model/time-scale/time-data';

import { firstTime } from '../helpers/fixtures';
import { createHeadlessChart } from '../helpers/headless-chart';

import { renderCase } from './harness';

const WIDTH = 400;
const HEIGHT = 100;

// a horizontal line, so that one row of pixels shows the dashes and the gaps
function flatLine(count: number): LineData[] {
	const result: LineData[] = [];
	for (let i = 0; i < count; i++) {
		result.push({ time: (firstTime + i * 60) as UTCTimestamp, value: 50 });
	}
	return result;
}

interface Runs {
	dashes: number[];
	gaps: number[];
}

/**
 * Draws a horizontal line series and measures the row of pixels in the middle of the line.
 * The result does not include the first and the last dash and gap: the edge of the chart or the end
 * of the series can cut them.
 */
function measure(lineStyle: LineStyle, lineWidth: LineWidth, pixelRatio: number): Runs {
	const chart = createHeadlessChart({
		width: WIDTH,
		height: HEIGHT,
		options: { timeScale: { barSpacing: 10 }, grid: { vertLines: { visible: false }, horzLines: { visible: false } } },
	});
	chart.addSeries('Line', { lastValueVisible: false, color: '#000000', lineStyle, lineWidth }).setData(flatLine(60));
	const image = renderCase(WIDTH, HEIGHT, pixelRatio, (ctx: CanvasRenderingContext2D, ratio: number) => chart.draw(ctx, ratio));

	// a pixel is in the line when it is nearer to black than to the white background
	const dark = (x: number, y: number): boolean => image.rgba[(y * image.width + x) * 4] < 128;

	let top = -1;
	let bottom = -1;
	for (let y = 0; y < image.height; y++) {
		for (let x = 0; x < image.width; x++) {
			if (dark(x, y)) {
				top = top < 0 ? y : top;
				bottom = y;
				break;
			}
		}
	}
	expect(top, 'the line is in the image').to.be.greaterThan(-1);
	const row = (top + bottom) >> 1;

	const runs: { dark: boolean; length: number }[] = [];
	for (let x = 0; x < image.width; x++) {
		const isDark = dark(x, row);
		const last = runs[runs.length - 1];
		if (last !== undefined && last.dark === isDark) {
			last.length++;
		} else {
			runs.push({ dark: isDark, length: 1 });
		}
	}
	const lengths = (isDark: boolean): number[] => runs
		.filter((run: { dark: boolean }) => run.dark === isDark)
		.map((run: { length: number }) => run.length)
		.slice(1, -1);
	return { dashes: lengths(true), gaps: lengths(false) };
}

function expectAll(lengths: number[], expected: number, message: string): void {
	expect(lengths.length, `${message}: number of runs`).to.be.greaterThan(2);
	for (const length of lengths) {
		// the start of the line is not always on a full pixel, thus a run can be one pixel off
		expect(length, message).to.be.within(expected - 1, expected + 1);
	}
}

// the lengths of a dash and of a gap, as multiples of the line width
const patterns: [string, LineStyle, number, number][] = [
	['Dotted', LineStyle.Dotted, 1, 1],
	['Dashed', LineStyle.Dashed, 2, 2],
	['LargeDashed', LineStyle.LargeDashed, 6, 6],
	['SparseDotted', LineStyle.SparseDotted, 1, 4],
];

describe('line series dash pattern (pixels)', () => {
	for (const [name, style, dash, gap] of patterns) {
		for (const lineWidth of [2, 3, 4] as LineWidth[]) {
			for (const pixelRatio of [1, 2]) {
				it(`${name}, width ${lineWidth}, ${pixelRatio}x`, () => {
					const runs = measure(style, lineWidth, pixelRatio);
					expectAll(runs.dashes, dash * lineWidth * pixelRatio, 'dash');
					expectAll(runs.gaps, gap * lineWidth * pixelRatio, 'gap');
				});
			}
		}
	}

	it('a solid line has no gaps', () => {
		const runs = measure(LineStyle.Solid, 3, 1);
		expect(runs.gaps).to.deep.equal([]);
	});

	it('a dotted line with a width of 1 pixel has as many gaps as dots', () => {
		// a dot of 1 pixel that is not on a full pixel is gray, thus the test counts the runs only
		const runs = measure(LineStyle.Dotted, 1, 2);
		expectAll(runs.dashes, 2, 'dash');
		expectAll(runs.gaps, 2, 'gap');
	});
});
