import { expect } from 'chai';
import { describe, it } from 'vitest';

import { candles } from '../helpers/fixtures';
import { createHeadlessChart, type HeadlessChart } from '../helpers/headless-chart';

import { compareWithGolden, renderCase } from './harness';

const WIDTH = 400;
const HEIGHT = 240;

// Glyph rendering can change between platforms, so these cases permit a small difference.
const textTolerance = { threshold: 0.1, maxDiffPixels: 60 };

interface Case {
	name: string;
	build: () => HeadlessChart;
}

const cases: Case[] = [
	{
		name: 'watermark-center',
		build: () => {
			const c = createHeadlessChart({
				width: WIDTH,
				height: HEIGHT,
				options: { timeScale: { barSpacing: 8 }, watermark: { visible: true, text: 'WATERMARK 123', fontSize: 32, color: 'rgba(0, 0, 0, 0.3)' } },
			});
			c.addSeries('Candlestick', { lastValueVisible: false }).setData(candles(50));
			return c;
		},
	},
	{
		name: 'watermark-bottom-left',
		build: () => {
			const c = createHeadlessChart({
				width: WIDTH,
				height: HEIGHT,
				options: { timeScale: { barSpacing: 8 }, watermark: { visible: true, text: 'abc', fontSize: 20, color: '#336699', horzAlign: 'left', vertAlign: 'bottom' } },
			});
			c.addSeries('Candlestick', { lastValueVisible: false }).setData(candles(50));
			return c;
		},
	},
];

describe('pane pixels (text, small tolerance)', () => {
	for (const testCase of cases) {
		for (const pixelRatio of [1, 2]) {
			const name = `${testCase.name}@${pixelRatio}x`;
			it(name, async () => {
				const chartUnderTest = testCase.build();
				const actual = renderCase(WIDTH, HEIGHT, pixelRatio, (ctx: CanvasRenderingContext2D, ratio: number) => chartUnderTest.draw(ctx, ratio));
				const result = await compareWithGolden(name, actual, textTolerance);
				expect(result.pass, result.message).to.equal(true);
			});
		}
	}
});
