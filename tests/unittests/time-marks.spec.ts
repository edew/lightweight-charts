import { expect } from 'chai';
import { describe, it } from 'vitest';

import type { UTCTimestamp } from '../../src/model/time-scale/time-data';
import { createHeadlessChart, type HeadlessChart } from '../helpers/headless-chart';

const DAY = 86400;

/** A chart 400 pixels wide with a line series. The minimum distance between marks is 60 pixels. */
function chart(count: number, step: number, start: number, barSpacing: number, timeScale: object = {}): HeadlessChart {
	const c = createHeadlessChart({ width: 400, height: 100, options: { timeScale: { barSpacing, rightOffset: 0, ...timeScale } } });
	const data = [];
	for (let i = 0; i < count; i++) {
		data.push({ time: (start + i * step) as UTCTimestamp, value: i });
	}
	c.addSeries('Line').setData(data);
	return c;
}

function labels(c: HeadlessChart): string[] {
	return (c.model.timeScale().marks() ?? []).map((mark) => mark.label);
}

function gaps(c: HeadlessChart): number[] {
	const marks = c.model.timeScale().marks() ?? [];
	const result = [];
	for (let i = 1; i < marks.length; i++) {
		result.push(marks[i].coord - marks[i - 1].coord);
	}
	return result;
}

describe('time marks', () => {
	const start = Date.UTC(2018, 10, 1) / 1000;

	it('have a constant distance', () => {
		// 60 / 6 = 10 bars: the step is 12 bars
		expect(gaps(chart(500, DAY, start, 6))).to.deep.equal([72, 72, 72, 72]);
		// across a gap in the data also
		expect(gaps(chart(500, 3 * DAY, start, 10))).to.deep.equal([60, 60, 60, 60, 60, 60]);
	});

	it('use a step that is a power of 2, or 3 times a power of 2', () => {
		const steps = [];
		for (const minBars of [1, 2, 3, 4, 5, 7, 10, 14, 20]) {
			const barSpacing = 60 / minBars;
			steps.push(gaps(chart(500, 3600, start, barSpacing))[0] / barSpacing);
		}
		expect(steps.map(Math.round)).to.deep.equal([1, 2, 3, 4, 6, 8, 12, 16, 24]);
	});

	it('are farther apart when each label can have a year', () => {
		// 6 bars are more than half a year
		expect(gaps(chart(500, 31 * DAY, start, 10))).to.deep.equal([120, 120]);
	});

	it('stay on the same time points after a scroll and after new data', () => {
		const c = createHeadlessChart({ width: 400, height: 100, options: { timeScale: { barSpacing: 10, rightOffset: 0 } } });
		const series = c.addSeries('Line');
		const data = [];
		for (let i = 0; i < 64; i++) {
			data.push({ time: (start + i * DAY) as UTCTimestamp, value: i });
		}
		series.setData(data);
		// step 6 days; the visible bars are 24 to 63
		expect(labels(c)).to.deep.equal(['Nov 25', 'Dec 1', 'Dec 7', 'Dec 13', 'Dec 19', 'Dec 25', 'Dec 31']);
		// the mark of 25 Nov goes out of view: the other marks do not change
		c.scrollBy(-30);
		expect(labels(c)).to.deep.equal(['Dec 1', 'Dec 7', 'Dec 13', 'Dec 19', 'Dec 25', 'Dec 31']);
		c.scrollBy(30);
		series.update({ time: (start + 64 * DAY) as UTCTimestamp, value: 1 });
		expect(labels(c)).to.deep.equal(['Dec 1', 'Dec 7', 'Dec 13', 'Dec 19', 'Dec 25', 'Dec 31']);
	});

	it('show the date, and the year on the first mark of a year', () => {
		// step 12 days from 1 Nov 2018
		expect(labels(chart(80, DAY, start, 5))).to.deep.equal(['Nov 1', 'Nov 13', 'Nov 25', 'Dec 7', 'Dec 19', 'Dec 31', 'Jan 12, 2019']);
	});

	it('show no year on the first time point', () => {
		expect(labels(chart(10, DAY, start, 10))[0]).to.equal('Nov 1');
	});

	it('show the time on the same day and the date on a new day', () => {
		// one bar for each hour, step 6 hours; the visible bars are 8 to 47
		const c = chart(48, 3600, start, 10, { timeVisible: true, secondsVisible: false });
		expect(labels(c)).to.deep.equal(['12:00', '18:00', 'Nov 2', '06:00', '12:00', '18:00']);
	});

	it('show the seconds only when a mark is not on a minute', () => {
		expect(labels(chart(32, 20, start, 10, { timeVisible: true }))).to.deep.equal(['Nov 1', '00:02', '00:04', '00:06', '00:08', '00:10']);
		expect(labels(chart(32, 7, start, 10, { timeVisible: true }))).to.deep.equal(['Nov 1', '00:00:42', '00:01:24', '00:02:06', '00:02:48', '00:03:30']);
	});

	it('show the date for intraday data when the time is not visible', () => {
		expect(labels(chart(48, 3600, start, 10))).to.deep.equal(['Nov 1', 'Nov 1', 'Nov 2', 'Nov 2', 'Nov 2', 'Nov 2']);
	});
});
