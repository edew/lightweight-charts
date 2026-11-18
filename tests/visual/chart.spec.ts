import { expect } from 'chai';
import { describe, it } from 'vitest';

import type { BarData } from '../../src/api/data-consumer';

import { candles, line } from '../helpers/fixtures';
import { createHeadlessChart, type HeadlessChart } from '../helpers/headless-chart';

import { compareWithGolden, type GoldenOptions, renderCase } from './harness';

const WIDTH = 480;
const HEIGHT = 320;

interface Case {
	name: string;
	build: () => HeadlessChart;
}

const noLabel = { lastValueVisible: false };

function volume(count: number): { time: BarData['time']; value: number }[] {
	return candles(count, 86400, 7).map((bar: BarData) => ({ time: bar.time, value: Math.round(bar.high * 100) }));
}

// Panes with no axes: no text, so these must match exactly.
const paneCases: Case[] = [
	{
		name: 'two-panes',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { timeScale: { barSpacing: 8 } } });
			c.addSeries('Candlestick', noLabel).setData(candles(80, 86400));
			c.addSeries('Line', { ...noLabel, pane: 1, lineWidth: 1 }).setData(volume(80));
			return c;
		},
	},
	{
		name: 'two-panes-stretch-3-1',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { timeScale: { barSpacing: 8 } } });
			c.addSeries('Candlestick', noLabel).setData(candles(80, 86400));
			c.addSeries('Line', { ...noLabel, pane: 1, lineWidth: 1 }).setData(volume(80));
			c.setPaneStretch(0, 3);
			return c;
		},
	},
	{
		name: 'three-panes-crosshair-in-pane-2',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { timeScale: { barSpacing: 8 } } });
			c.addSeries('Candlestick', noLabel).setData(candles(80, 86400));
			c.addSeries('Line', { ...noLabel, pane: 1, lineWidth: 1 }).setData(volume(80));
			c.addSeries('Line', { ...noLabel, pane: 2, color: '#e91e63' }).setData(line(80, 86400));
			c.setCrosshair(250, 40, 1);
			return c;
		},
	},
	{
		name: 'overlay-series-with-margins',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { timeScale: { barSpacing: 8 } } });
			c.addSeries('Candlestick', noLabel).setData(candles(80, 86400));
			c.addSeries('Line', { ...noLabel, overlay: true, scaleMargins: { top: 0.8, bottom: 0 }, lineWidth: 1 }).setData(volume(80));
			return c;
		},
	},
];

// The full chart with axes. These have text, so a small difference is permitted.
const axes = { priceScale: { position: 'right' as const }, timeScale: { visible: true, barSpacing: 8 } };
const chartCases: Case[] = [
	{
		name: 'chart-right-axis',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: axes });
			c.addSeries('Candlestick').setData(candles(120, 86400));
			return c;
		},
	},
	{
		name: 'chart-left-axis',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { ...axes, priceScale: { position: 'left' as const } } });
			c.addSeries('Candlestick').setData(candles(120, 86400));
			return c;
		},
	},
	{
		name: 'chart-intraday-time-visible',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { ...axes, timeScale: { visible: true, barSpacing: 8, timeVisible: true, secondsVisible: false } } });
			c.addSeries('Line').setData(line(400, 300));
			return c;
		},
	},
	{
		name: 'chart-months-and-years',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { ...axes, timeScale: { visible: true, barSpacing: 1 } } });
			c.addSeries('Line', { lineWidth: 1 }).setData(line(900, 86400));
			return c;
		},
	},
	{
		name: 'chart-two-panes-title-and-labels',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: axes });
			c.addSeries('Candlestick', { title: 'MAIN' }).setData(candles(120, 86400));
			c.addSeries('Line', { color: '#ff9800', lineWidth: 1 }).setData(candles(120, 86400).map((b: BarData) => ({ time: b.time, value: b.low - 1 })));
			c.addSeries('Line', { pane: 1, lineWidth: 1 }).setData(volume(120));
			c.setPaneStretch(0, 2);
			return c;
		},
	},
	{
		name: 'chart-three-panes-crosshair',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: axes });
			c.addSeries('Candlestick').setData(candles(120, 86400));
			c.addSeries('Line', { pane: 1, lineWidth: 1 }).setData(volume(120));
			c.addSeries('Line', { pane: 2, color: '#e91e63' }).setData(line(120, 86400));
			c.setCrosshair(200, 30, 1);
			return c;
		},
	},
	{
		name: 'chart-percentage-mode',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { ...axes, priceScale: { position: 'right' as const, mode: 2 } } });
			c.addSeries('Line').setData(line(120, 86400));
			c.addSeries('Line', { color: '#e91e63' }).setData(line(120, 86400, 9));
			return c;
		},
	},
	{
		name: 'chart-business-days',
		build: () => {
			const c = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: axes });
			const data = line(60, 86400).map((point: { value: number }, i: number) => ({
				time: { year: 2020, month: 1 + Math.floor(i / 28), day: 1 + (i % 28) },
				value: point.value,
			}));
			c.addSeries('Line').setData(data);
			c.setCrosshair(300, 100);
			return c;
		},
	},
];

function run(cases: Case[], pixelRatios: number[], options: GoldenOptions): void {
	for (const testCase of cases) {
		for (const pixelRatio of pixelRatios) {
			const name = `${testCase.name}@${pixelRatio}x`;
			it(name, async () => {
				const chartUnderTest = testCase.build();
				const actual = renderCase(WIDTH, HEIGHT, pixelRatio, (ctx: CanvasRenderingContext2D, ratio: number) => chartUnderTest.draw(ctx, ratio));
				const result = await compareWithGolden(name, actual, options);
				expect(result.pass, result.message).to.equal(true);
			});
		}
	}
}

describe('chart pixels: panes (geometry, exact match)', () => {
	run(paneCases, [0.75, 1, 1.5, 2], {});
});

describe('chart pixels: full chart with axes (text, small tolerance)', () => {
	run(chartCases, [1, 2], { threshold: 0.1, maxDiffPixels: 150 });
});
