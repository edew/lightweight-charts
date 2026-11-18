import { expect } from 'chai';
import { describe, it } from 'vitest';

import type { BarData, LineData } from '../../src/api/data-consumer';
import type { UTCTimestamp } from '../../src/model/time-scale/time-data';

import { candles, firstTime, line } from '../helpers/fixtures';
import { createHeadlessChart, type HeadlessChart } from '../helpers/headless-chart';

import { compareWithGolden, renderCase } from './harness';

const WIDTH = 400;
const HEIGHT = 240;
const pixelRatios = [0.75, 1, 1.5, 2];

interface Case {
	name: string;
	build: () => HeadlessChart;
}

function chart(barSpacing: number): HeadlessChart {
	return createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { timeScale: { barSpacing } } });
}

// No text in these cases: the last-value label is off and the watermark is off by default.
const noLabel = { lastValueVisible: false };

const cases: Case[] = [
	{
		name: 'candles-50',
		build: () => {
			const c = chart(8);
			c.addSeries('Candlestick', noLabel).setData(candles(50));
			return c;
		},
	},
	{
		name: 'candles-50-no-border-no-wick',
		build: () => {
			const c = chart(8);
			c.addSeries('Candlestick', { ...noLabel, borderVisible: false, wickVisible: false }).setData(candles(50));
			return c;
		},
	},
	{
		name: 'candles-wide',
		build: () => {
			const c = chart(30);
			c.addSeries('Candlestick', noLabel).setData(candles(12));
			return c;
		},
	},
	{
		name: 'candles-500-dense',
		build: () => {
			const c = chart(1.5);
			c.addSeries('Candlestick', noLabel).setData(candles(500));
			return c;
		},
	},
	{
		name: 'candles-scrolled',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { timeScale: { barSpacing: 8, rightOffset: 10 } } });
			c.addSeries('Candlestick', noLabel).setData(candles(200));
			return c;
		},
	},
	{
		name: 'line-200',
		build: () => {
			const c = chart(4);
			c.addSeries('Line', noLabel).setData(line(200));
			return c;
		},
	},
	{
		name: 'line-steps',
		build: () => {
			const c = chart(10);
			c.addSeries('Line', { ...noLabel, lineType: 1, lineWidth: 1 }).setData(line(40));
			return c;
		},
	},
	{
		name: 'line-dashed',
		build: () => {
			const c = chart(6);
			c.addSeries('Line', { ...noLabel, lineStyle: 2, lineWidth: 2 }).setData(line(60));
			return c;
		},
	},
	{
		name: 'line-one-point',
		build: () => {
			const c = chart(6);
			c.addSeries('Line', noLabel).setData(line(1));
			return c;
		},
	},
	{
		name: 'line-with-time-gap',
		build: () => {
			const c = chart(6);
			// the candles define all time points; the line has no values for points 20 to 39
			c.addSeries('Candlestick', noLabel).setData(candles(60));
			const points: LineData[] = line(60).map((p: LineData) => ({ time: p.time, value: p.value + 50 }));
			c.addSeries('Line', noLabel).setData(points.filter((_: LineData, i: number) => i < 20 || i >= 40));
			return c;
		},
	},
	{
		name: 'line-left-of-viewport',
		build: () => {
			const c = chart(6);
			c.addSeries('Candlestick', noLabel).setData(candles(300));
			// the line has data only for the first 10 time points, which are not visible
			c.addSeries('Line', noLabel).setData(line(10));
			return c;
		},
	},
	{
		name: 'empty-series',
		build: () => {
			const c = chart(6);
			c.addSeries('Line', noLabel).setData([]);
			return c;
		},
	},
	{
		name: 'candles-and-line',
		build: () => {
			const c = chart(6);
			c.addSeries('Candlestick', noLabel).setData(candles(120));
			c.addSeries('Line', { ...noLabel, lineWidth: 1 }).setData(candles(120).map((b: BarData) => ({ time: b.time, value: (b.high + b.low) / 2 })));
			return c;
		},
	},
	{
		name: 'crosshair',
		build: () => {
			const c = chart(8);
			c.addSeries('Candlestick', noLabel).setData(candles(50));
			c.setCrosshair(203, 77);
			return c;
		},
	},
	{
		name: 'crosshair-line-marker',
		build: () => {
			const c = chart(8);
			c.addSeries('Line', noLabel).setData(line(50));
			c.setCrosshair(150, 100);
			return c;
		},
	},
	{
		name: 'after-updates',
		build: () => {
			const c = chart(8);
			const data = candles(60);
			const series = c.addSeries('Candlestick', noLabel);
			series.setData(data.slice(0, 50));
			for (let i = 50; i < 60; i++) {
				// first an in-place tick with other values, then the final bar, then a new bar
				series.update({ ...data[i], close: data[i].open });
				series.update(data[i]);
			}
			series.update({ time: (firstTime + 59 * 60) as UTCTimestamp, open: 100, high: 104, low: 99, close: 103 });
			return c;
		},
	},
];

describe('pane pixels (geometry, exact match)', () => {
	for (const testCase of cases) {
		for (const pixelRatio of pixelRatios) {
			const name = `${testCase.name}@${pixelRatio}x`;
			it(name, async () => {
				const chartUnderTest = testCase.build();
				const actual = renderCase(WIDTH, HEIGHT, pixelRatio, (ctx: CanvasRenderingContext2D, ratio: number) => chartUnderTest.draw(ctx, ratio));
				const result = await compareWithGolden(name, actual);
				expect(result.pass, result.message).to.equal(true);
			});
		}
	}
});
