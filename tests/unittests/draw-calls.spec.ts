import { expect } from 'chai';
import { describe, expect as expectSnapshot, it } from 'vitest';

import type { BarData } from '../../src/api/data-consumer';
import type { UTCTimestamp } from '../../src/model/time-scale/time-data';

import { candles, firstTime, line } from '../helpers/fixtures';
import { createHeadlessChart, type HeadlessChart } from '../helpers/headless-chart';
import { createRecordingContext, type RecordingContext } from '../helpers/recording-context';

// no grid and no watermark: only the series draws
const seriesOnly = {
	timeScale: { barSpacing: 8 },
	grid: { vertLines: { visible: false }, horzLines: { visible: false } },
};

function draw(chart: HeadlessChart): RecordingContext {
	const recording = createRecordingContext();
	chart.draw(recording.ctx, 1);
	return recording;
}

function risingCandles(count: number): BarData[] {
	const result: BarData[] = [];
	for (let i = 0; i < count; i++) {
		result.push({ time: (firstTime + i * 60) as UTCTimestamp, open: 10 + i, high: 13 + i, low: 9 + i, close: 12 + i });
	}
	return result;
}

describe('draw calls', () => {
	it('a line is one path with one stroke', () => {
		const chart = createHeadlessChart({ width: 400, height: 240, options: seriesOnly });
		chart.addSeries('Line', { lastValueVisible: false }).setData(line(200));
		const recording = draw(chart);

		expect(recording.count('stroke')).to.equal(1);
		// one path for the clip rectangle of the pane and one for the line
		expect(recording.count('beginPath')).to.equal(2);
		expect(recording.count('moveTo')).to.equal(1);
		// 400 px / 8 px for each bar = 50 visible bars, and one more bar on the left for the line
		expect(recording.count('lineTo')).to.equal(50);
	});

	it('draws only the visible bars of a long series', () => {
		const chart = createHeadlessChart({ width: 400, height: 240, options: seriesOnly });
		chart.addSeries('Candlestick', { lastValueVisible: false, wickVisible: false, borderVisible: false }).setData(candles(5000));
		const recording = draw(chart);

		// one rectangle for the background and one for each of the 50 visible bars
		expect(recording.count('fillRect')).to.equal(51);
	});

	it('writes the fill color only when it changes from bar to bar', () => {
		const chart = createHeadlessChart({ width: 400, height: 240, options: seriesOnly });
		chart.addSeries('Candlestick', { lastValueVisible: false }).setData(risingCandles(50));
		const recording = draw(chart);

		// background, then one color for each of the three passes (wicks, borders, bodies)
		expect(recording.count('fillStyle')).to.equal(4);
	});

	it('does not save or restore the context in a bar loop', () => {
		const chart = createHeadlessChart({ width: 400, height: 240, options: seriesOnly });
		chart.addSeries('Candlestick', { lastValueVisible: false }).setData(candles(50));
		const recording = draw(chart);

		// the pane region and the series
		expect(recording.count('save')).to.equal(2);
		expect(recording.count('restore')).to.equal(2);
	});

	it('draws nothing on the overlay when there is no crosshair', () => {
		const chart = createHeadlessChart({ width: 400, height: 240, options: seriesOnly });
		chart.addSeries('Line', { lastValueVisible: false }).setData(line(10));
		const before = draw(chart).log.length;

		chart.setCrosshair(100, 100);
		const withCrosshair = draw(chart).log.length;
		chart.clearCrosshair();

		expect(withCrosshair).to.be.greaterThan(before);
		expect(draw(chart).log.length).to.equal(before);
	});

	it('starts a new part of the line after a value that is not a number', () => {
		const chart = createHeadlessChart({ width: 400, height: 240, options: seriesOnly });
		const data = line(20);
		data[10] = { time: data[10].time, value: NaN };
		chart.addSeries('Line', { lastValueVisible: false }).setData(data);
		const recording = draw(chart);

		expect(recording.count('moveTo')).to.equal(2);
		expect(recording.count('lineTo')).to.equal(17);
		expect(recording.count('stroke')).to.equal(1);
	});

	it('has a stable call sequence for a small candlestick chart', () => {
		const chart = createHeadlessChart({ width: 40, height: 30, options: { ...seriesOnly, timeScale: { barSpacing: 10 } } });
		chart.addSeries('Candlestick', { lastValueVisible: false }).setData([
			{ time: firstTime as UTCTimestamp, open: 10, high: 14, low: 9, close: 13 },
			{ time: (firstTime + 60) as UTCTimestamp, open: 13, high: 15, low: 11, close: 12 },
		]);
		expectSnapshot(draw(chart).log).toMatchSnapshot();
	});
});
