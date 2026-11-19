import { expect } from 'chai';
import { describe, it } from 'vitest';

import { DataStore, SearchMode, type SeriesStore, spanByTime, UpdateKind } from '../../src/model/data-store';

function f64(...values: number[]): Float64Array {
	return new Float64Array(values);
}

function times(store: DataStore): number[] {
	return Array.from(store.times.subarray(0, store.length));
}

function timeIndexes(series: SeriesStore): number[] {
	const result: number[] = [];
	for (let row = 0; row < series.length; row++) {
		result.push(series.timeIndexAt(row));
	}
	return result;
}

function closes(series: SeriesStore): number[] {
	const result: number[] = [];
	for (let row = 0; row < series.length; row++) {
		result.push(series.closeAt(row));
	}
	return result;
}

describe('DataStore', () => {
	it('stores one series with consecutive time indexes and no index array', () => {
		const store = new DataStore();
		const line = store.createSeries(1);
		store.setSeriesData(line, f64(10, 20, 30), f64(1, 2, 3));

		expect(times(store)).to.deep.equal([10, 20, 30]);
		expect(line.index).to.equal(null);
		expect(timeIndexes(line)).to.deep.equal([0, 1, 2]);
		expect(closes(line)).to.deep.equal([1, 2, 3]);
	});

	it('stores four values for each candle and gives the close price', () => {
		const store = new DataStore();
		const candles = store.createSeries(4);
		store.setSeriesData(candles, f64(10, 20), f64(1, 4, 0, 3, 3, 6, 2, 5));
		expect(closes(candles)).to.deep.equal([3, 5]);
	});

	it('makes the union of the times of two series that do not align', () => {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(1000, 3000), f64(1, 3));
		store.setSeriesData(b, f64(2000, 4000), f64(2, 4));

		expect(times(store)).to.deep.equal([1000, 2000, 3000, 4000]);
		expect(timeIndexes(a)).to.deep.equal([0, 2]);
		expect(timeIndexes(b)).to.deep.equal([1, 3]);
		expect(a.index).to.not.equal(null);
	});

	it('keeps a series without an index array when it is a consecutive part of the times', () => {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(10, 20, 30, 40, 50), f64(1, 2, 3, 4, 5));
		store.setSeriesData(b, f64(30, 40), f64(7, 8));

		expect(times(store)).to.deep.equal([10, 20, 30, 40, 50]);
		expect(b.index).to.equal(null);
		expect(b.first).to.equal(2);
		expect(timeIndexes(b)).to.deep.equal([2, 3]);
	});

	it('removes time points that have no series after new data', () => {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(1000, 3000), f64(1, 3));
		store.setSeriesData(b, f64(2000, 4000), f64(2, 4));
		store.setSeriesData(a, f64(2000, 4000), f64(5, 6));

		expect(times(store)).to.deep.equal([2000, 4000]);
		expect(timeIndexes(a)).to.deep.equal([0, 1]);
		expect(timeIndexes(b)).to.deep.equal([0, 1]);
	});

	it('removes a series and its time points', () => {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(1000, 3000), f64(1, 3));
		store.setSeriesData(b, f64(2000, 4000), f64(2, 4));
		store.removeSeries(a);

		expect(times(store)).to.deep.equal([2000, 4000]);
		expect(timeIndexes(b)).to.deep.equal([0, 1]);
	});

	it('updates the last row in place', () => {
		const store = new DataStore();
		const candles = store.createSeries(4);
		store.setSeriesData(candles, f64(10, 20), f64(1, 4, 0, 3, 3, 6, 2, 5));
		const generation = store.generation;

		expect(store.updateSeries(candles, 20, 3, 9, 1, 8)).to.equal(UpdateKind.InPlace);
		expect(Array.from(candles.values.subarray(4, 8))).to.deep.equal([3, 9, 1, 8]);
		expect(store.length).to.equal(2);
		expect(store.generation).to.equal(generation);
	});

	it('appends a new time point and grows the arrays', () => {
		const store = new DataStore();
		const line = store.createSeries(1);
		const generation = store.generation;
		expect(store.updateSeries(line, 10, 1, 0, 0, 0)).to.equal(UpdateKind.AppendTime);
		for (let i = 1; i < 100; i++) {
			expect(store.updateSeries(line, 10 + i * 10, i + 1, 0, 0, 0)).to.equal(UpdateKind.AppendTime);
		}

		expect(store.length).to.equal(100);
		// an append does not change existing time points
		expect(store.generation).to.equal(generation);
		expect(line.length).to.equal(100);
		expect(line.index).to.equal(null);
		expect(store.times[99]).to.equal(1000);
		expect(line.closeAt(99)).to.equal(100);
	});

	it('appends a row at a time point that another series already has', () => {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(10, 20, 30), f64(1, 2, 3));
		store.setSeriesData(b, f64(10, 20), f64(5, 6));

		expect(store.updateSeries(b, 30, 7, 0, 0, 0)).to.equal(UpdateKind.AppendRow);
		expect(times(store)).to.deep.equal([10, 20, 30]);
		expect(timeIndexes(b)).to.deep.equal([0, 1, 2]);
	});

	it('makes an index array when an append leaves a hole', () => {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(10, 20, 30), f64(1, 2, 3));
		store.setSeriesData(b, f64(10), f64(5));

		expect(store.updateSeries(b, 30, 7, 0, 0, 0)).to.equal(UpdateKind.AppendRow);
		expect(timeIndexes(b)).to.deep.equal([0, 2]);
		expect(closes(b)).to.deep.equal([5, 7]);
	});

	it('rebuilds when a series adds a time point before the end', () => {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(10, 20, 40), f64(1, 2, 4));
		store.setSeriesData(b, f64(10, 20), f64(5, 6));

		expect(store.updateSeries(b, 30, 7, 0, 0, 0)).to.equal(UpdateKind.Rebuild);
		expect(times(store)).to.deep.equal([10, 20, 30, 40]);
		expect(timeIndexes(a)).to.deep.equal([0, 1, 3]);
		expect(timeIndexes(b)).to.deep.equal([0, 1, 2]);
		expect(closes(a)).to.deep.equal([1, 2, 4]);
		expect(closes(b)).to.deep.equal([5, 6, 7]);
	});

	it('throws on an update that is older than the last row of the series', () => {
		const store = new DataStore();
		const line = store.createSeries(1);
		store.setSeriesData(line, f64(10, 20), f64(1, 2));
		expect(() => store.updateSeries(line, 15, 3, 0, 0, 0)).to.throw('Cannot update oldest data');
	});

	it('finds a time index by time', () => {
		const store = new DataStore();
		expect(store.indexOfTime(10, true)).to.equal(null);

		const line = store.createSeries(1);
		store.setSeriesData(line, f64(10, 20, 30), f64(1, 2, 3));
		expect(store.indexOfTime(20, false)).to.equal(1);
		expect(store.indexOfTime(25, false)).to.equal(null);
		expect(store.indexOfTime(25, true)).to.equal(2);
		expect(store.indexOfTime(5, true)).to.equal(0);
		expect(store.indexOfTime(99, true)).to.equal(2);
		expect(store.indexOfTime(99, false)).to.equal(null);
	});
});

describe('SeriesStore search', () => {
	function sparse(): SeriesStore {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(0, 1, 2, 3, 4, 5, 6), f64(0, 0, 0, 0, 0, 0, 0));
		// b has rows at time indexes 1, 3 and 6
		store.setSeriesData(b, f64(1, 3, 6), f64(10, 30, 60));
		return b;
	}

	function dense(): SeriesStore {
		const store = new DataStore();
		const a = store.createSeries(1);
		const b = store.createSeries(1);
		store.setSeriesData(a, f64(0, 1, 2, 3, 4, 5, 6), f64(0, 0, 0, 0, 0, 0, 0));
		// b has rows at time indexes 2, 3 and 4
		store.setSeriesData(b, f64(2, 3, 4), f64(20, 30, 40));
		return b;
	}

	it('finds exact rows', () => {
		expect(sparse().rowAt(3)).to.equal(1);
		expect(sparse().rowAt(2)).to.equal(-1);
		expect(dense().rowAt(3)).to.equal(1);
		expect(dense().rowAt(5)).to.equal(-1);
		expect(dense().rowAt(1)).to.equal(-1);
	});

	it('finds the nearest row on the left', () => {
		expect(sparse().rowAt(5, SearchMode.NearestLeft)).to.equal(1);
		expect(sparse().rowAt(0, SearchMode.NearestLeft)).to.equal(-1);
		expect(sparse().rowAt(99, SearchMode.NearestLeft)).to.equal(2);
		expect(dense().rowAt(6, SearchMode.NearestLeft)).to.equal(2);
		expect(dense().rowAt(1, SearchMode.NearestLeft)).to.equal(-1);
	});

	it('finds the nearest row on the right', () => {
		expect(sparse().rowAt(4, SearchMode.NearestRight)).to.equal(2);
		expect(sparse().rowAt(7, SearchMode.NearestRight)).to.equal(-1);
		expect(sparse().rowAt(-5, SearchMode.NearestRight)).to.equal(0);
		expect(dense().rowAt(0, SearchMode.NearestRight)).to.equal(0);
		expect(dense().rowAt(5, SearchMode.NearestRight)).to.equal(-1);
	});

	it('gives the lower bound for a range scan', () => {
		expect(sparse().lowerBound(2)).to.equal(1);
		expect(sparse().lowerBound(7)).to.equal(3);
		expect(dense().lowerBound(-3)).to.equal(0);
		expect(dense().lowerBound(4)).to.equal(2);
		expect(dense().lowerBound(5)).to.equal(3);
	});
});

describe('spanByTime', () => {
	const day = 86400;
	const base = Date.UTC(2020, 5, 15, 12, 0, 0) / 1000;

	it('gives 20 for the first time point', () => {
		expect(spanByTime(base, null)).to.equal(20);
	});

	it('gives the largest calendar unit that changed', () => {
		expect(spanByTime(Date.UTC(2021, 0, 1) / 1000, Date.UTC(2020, 11, 31) / 1000)).to.equal(70);
		expect(spanByTime(Date.UTC(2020, 6, 1) / 1000, Date.UTC(2020, 5, 30) / 1000)).to.equal(60);
		expect(spanByTime(base + day, base)).to.equal(50);
	});

	it('gives the intraday steps', () => {
		const midnight = Date.UTC(2020, 5, 15) / 1000;
		expect(spanByTime(midnight + 12 * 3600, midnight + 12 * 3600 - 60)).to.equal(33);
		expect(spanByTime(midnight + 6 * 3600, midnight + 6 * 3600 - 60)).to.equal(32);
		expect(spanByTime(midnight + 3 * 3600, midnight + 3 * 3600 - 60)).to.equal(31);
		expect(spanByTime(midnight + 3600, midnight + 3600 - 60)).to.equal(30);
		expect(spanByTime(midnight + 1800, midnight + 1800 - 60)).to.equal(22);
		expect(spanByTime(midnight + 300, midnight + 300 - 60)).to.equal(21);
		expect(spanByTime(midnight + 60, midnight + 59)).to.equal(20);
		expect(spanByTime(midnight + 61, midnight + 60)).to.equal(19);
	});
});
