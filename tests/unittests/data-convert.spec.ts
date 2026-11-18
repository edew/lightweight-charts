import { expect } from 'chai';
import { describe, it } from 'vitest';

import { convertSeriesData, isBusinessDayTime, itemTimeToSeconds, secondsToTime, stringToBusinessDay, timeToSeconds } from '../../src/api/data-convert';
import type { UTCTimestamp } from '../../src/model/time-scale/time-data';

const ts = (value: number): UTCTimestamp => value as UTCTimestamp;

describe('data-convert', () => {
	it('converts all public time types to UTC seconds', () => {
		expect(timeToSeconds(ts(1000))).to.equal(1000);
		expect(timeToSeconds({ year: 2019, month: 6, day: 1 })).to.equal(Date.UTC(2019, 5, 1) / 1000);
		expect(timeToSeconds('2019-06-01')).to.equal(Date.UTC(2019, 5, 1) / 1000);
	});

	it('converts seconds back to the time type of the user', () => {
		expect(secondsToTime(1000, false)).to.equal(1000);
		expect(secondsToTime(Date.UTC(2019, 5, 1) / 1000, true)).to.deep.equal({ year: 2019, month: 6, day: 1 });
	});

	it('parses a date string to a business day', () => {
		expect(stringToBusinessDay('2019-05-01')).to.deep.equal({ day: 1, month: 5, year: 2019 });
		expect(() => stringToBusinessDay('abc')).to.throw();
	});

	it('knows which times are business days', () => {
		expect(isBusinessDayTime(ts(1))).to.equal(false);
		expect(isBusinessDayTime('2019-05-01')).to.equal(true);
		expect(isBusinessDayTime({ year: 2019, month: 5, day: 1 })).to.equal(true);
	});

	it('throws when the time type of an item is not the type of the chart', () => {
		expect(() => itemTimeToSeconds(ts(1000), true)).to.throw('time must be of type BusinessDay');
		expect(() => itemTimeToSeconds('2019-05-01', false)).to.throw('time must be of type isUTCTimestamp');
	});

	it('copies line data into typed arrays and does not change the input', () => {
		const data = [{ time: '2019-05-01', value: 1 }, { time: '2019-05-02', value: 2 }];
		const result = convertSeriesData(1, data);
		expect(result.count).to.equal(2);
		expect(result.businessDay).to.equal(true);
		expect(Array.from(result.times)).to.deep.equal([Date.UTC(2019, 4, 1) / 1000, Date.UTC(2019, 4, 2) / 1000]);
		expect(Array.from(result.values)).to.deep.equal([1, 2]);
		expect(data[0].time).to.equal('2019-05-01');
	});

	it('copies bar data with four values for each bar', () => {
		const result = convertSeriesData(4, [
			{ time: ts(10), open: 1, high: 4, low: 0, close: 3 },
			{ time: ts(20), open: 3, high: 6, low: 2, close: 5 },
		]);
		expect(result.businessDay).to.equal(false);
		expect(Array.from(result.values)).to.deep.equal([1, 4, 0, 3, 3, 6, 2, 5]);
	});

	it('sorts input that is not in order; the last item wins for a duplicate time', () => {
		const result = convertSeriesData(1, [
			{ time: ts(30), value: 3 },
			{ time: ts(10), value: 1 },
			{ time: ts(20), value: 2 },
			{ time: ts(10), value: 9 },
		]);
		expect(result.count).to.equal(3);
		expect(Array.from(result.times)).to.deep.equal([10, 20, 30]);
		expect(Array.from(result.values)).to.deep.equal([9, 2, 3]);
	});

	it('handles empty data', () => {
		const result = convertSeriesData(4, []);
		expect(result.count).to.equal(0);
		expect(result.times.length).to.equal(0);
	});

	it('throws when the items have different time types', () => {
		expect(() => convertSeriesData(1, [{ time: ts(10), value: 1 }, { time: '2019-05-01', value: 2 }])).to.throw();
	});
});
