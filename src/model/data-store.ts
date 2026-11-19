// Columnar storage for all series of one chart.
//
// The chart has one sorted array of times (UTC seconds). The position of a time in
// that array is its time point index. Each series has one flat array of values with
// `stride` numbers for each row (1: value; 4: open, high, low, close).

import type { Nominal } from '../helpers/nominal';

const MIN_CAPACITY = 16;

/** Result of a streaming update. Higher values need more work in the model. */
export const enum UpdateKind {
	/** The last row of the series got new values. Nothing else changed. */
	InPlace = 0,
	/** The series got a new row at a time point that was already in the chart. */
	AppendRow = 1,
	/** The chart got a new last time point. */
	AppendTime = 2,
	/** A time point was inserted before the end. All time indexes can be different. */
	Rebuild = 3,
}

export const enum SearchMode {
	NearestLeft = -1,
	Exact = 0,
	NearestRight = 1,
}

/**
 * UTC seconds in ascending order with no duplicates. Only the code that makes the array
 * and checks the order gives it this type.
 */
export type SortedTimes = Nominal<Float64Array, 'SortedTimes'>;

export class SeriesStore {
	public readonly stride: number;
	public values: Float64Array = new Float64Array(0);
	/** Number of rows. */
	public length: number = 0;
	/** Time index of row 0. Used when `index` is null: row r is at time index `first + r`. */
	public first: number = 0;
	/** Time index of each row, only when the rows are not at consecutive time indexes. */
	public index: Int32Array | null = null;

	public constructor(stride: number) {
		this.stride = stride;
	}

	public timeIndexAt(row: number): number {
		return this.index === null ? this.first + row : this.index[row];
	}

	public lastTimeIndex(): number {
		return this.length === 0 ? -1 : this.timeIndexAt(this.length - 1);
	}

	/** First row with a time index that is not less than `timeIndex`. Can be `length`. */
	public lowerBound(timeIndex: number): number {
		const index = this.index;
		if (index === null) {
			return Math.min(Math.max(Math.ceil(timeIndex) - this.first, 0), this.length);
		}

		let lo = 0;
		let hi = this.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (index[mid] < timeIndex) {
				lo = mid + 1;
			} else {
				hi = mid;
			}
		}
		return lo;
	}

	/** Row at `timeIndex`, or the nearest row on the given side. Returns -1 when there is none. */
	public rowAt(timeIndex: number, mode: SearchMode = SearchMode.Exact): number {
		const row = this.lowerBound(timeIndex);
		if (row < this.length && this.timeIndexAt(row) === timeIndex) {
			return row;
		}

		if (mode === SearchMode.NearestRight) {
			return row < this.length ? row : -1;
		}

		if (mode === SearchMode.NearestLeft) {
			return row - 1;
		}

		return -1;
	}

	/** The value that represents the row as one price (the close price). */
	public closeAt(row: number): number {
		return this.values[row * this.stride + this.stride - 1];
	}
}

function grow<T extends Float64Array | Int32Array | Uint8Array>(array: T, used: number, needed: number): T {
	if (needed <= array.length) {
		return array;
	}

	const capacity = Math.max(MIN_CAPACITY, needed, array.length * 2);
	const result = new (array.constructor as new (length: number) => T)(capacity);
	result.set(used === array.length ? array : array.subarray(0, used));
	return result;
}

function lowerBoundTime(times: Float64Array, length: number, time: number): number {
	let lo = 0;
	let hi = length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (times[mid] < time) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	return lo;
}

/** Merges two sorted arrays with unique values into one. */
function mergeUnique(a: Float64Array, b: Float64Array): Float64Array {
	if (a.length === 0) {
		return b;
	}
	if (b.length === 0) {
		return a;
	}

	const result = new Float64Array(a.length + b.length);
	let i = 0;
	let j = 0;
	let k = 0;
	while (i < a.length && j < b.length) {
		const x = a[i];
		const y = b[j];
		if (x < y) {
			result[k++] = x;
			i++;
		} else if (y < x) {
			result[k++] = y;
			j++;
		} else {
			result[k++] = x;
			i++;
			j++;
		}
	}
	while (i < a.length) {
		result[k++] = a[i++];
	}
	while (j < b.length) {
		result[k++] = b[j++];
	}
	return k === result.length ? result : result.subarray(0, k);
}

/**
 * Weight of a time point for the tick marks of the time axis: the largest unit of time
 * that changed since the time point before it. A larger unit has a larger weight.
 * A weight is stored in one byte, and the tick mark code permits at most 15 different weights.
 */
export const enum TickMarkWeight {
	Second = 19,
	Minute = 20,
	Minute5 = 21,
	Minute30 = 22,
	Hour = 30,
	Hour3 = 31,
	Hour6 = 32,
	Hour12 = 33,
	Day = 50,
	Month = 60,
	Year = 70,
}

const SECONDS_IN_DAY = 86400;
// from the largest step to the smallest: [seconds, weight]
const intradaySpans: readonly (readonly [number, TickMarkWeight])[] = [
	[12 * 3600, TickMarkWeight.Hour12],
	[6 * 3600, TickMarkWeight.Hour6],
	[3 * 3600, TickMarkWeight.Hour3],
	[3600, TickMarkWeight.Hour],
	[30 * 60, TickMarkWeight.Minute30],
	[5 * 60, TickMarkWeight.Minute5],
	[60, TickMarkWeight.Minute],
	[1, TickMarkWeight.Second],
];

/** The weight of a time point. The first time point has no time point before it. */
export function spanByTime(time: number, previousTime: number | null): TickMarkWeight {
	if (previousTime === null) {
		return TickMarkWeight.Minute;
	}

	if (Math.floor(time / SECONDS_IN_DAY) !== Math.floor(previousTime / SECONDS_IN_DAY)) {
		const current = new Date(time * 1000);
		const previous = new Date(previousTime * 1000);
		if (current.getUTCFullYear() !== previous.getUTCFullYear()) {
			return TickMarkWeight.Year;
		}
		return current.getUTCMonth() !== previous.getUTCMonth() ? TickMarkWeight.Month : TickMarkWeight.Day;
	}

	for (const [step, span] of intradaySpans) {
		if (Math.floor(time / step) !== Math.floor(previousTime / step)) {
			return span;
		}
	}

	return TickMarkWeight.Minute;
}

export class DataStore {
	/** Sorted UTC seconds. Only the first `length` items are valid. */
	public times: Float64Array = new Float64Array(0);
	/** Tick-mark weight for each time point. */
	public spans: Uint8Array = new Uint8Array(0);
	public length: number = 0;
	/**
	 * Changes each time existing time points change. It does not change when time
	 * points are only added at the end. Caches use it as a key.
	 */
	public generation: number = 0;
	/** True when the user gives times as business days. Null until the first data. */
	public businessDay: boolean | null = null;

	readonly #series: SeriesStore[] = [];

	public createSeries(stride: number): SeriesStore {
		const series = new SeriesStore(stride);
		this.#series.push(series);
		return series;
	}

	/** True if a series that is not `series` has data. */
	public hasOtherRows(series: SeriesStore): boolean {
		for (const other of this.#series) {
			if (other !== series && other.length !== 0) {
				return true;
			}
		}
		return false;
	}

	public removeSeries(series: SeriesStore): void {
		const position = this.#series.indexOf(series);
		if (position !== -1) {
			this.#series.splice(position, 1);
			series.length = 0;
			this.#rebuild(series, new Float64Array(0));
		}
	}

	/**
	 * Replaces all data of a series. `values` has `stride` values for each time.
	 * The store takes ownership of both arrays.
	 */
	public setSeriesData(series: SeriesStore, times: SortedTimes, values: Float64Array): void {
		series.values = values;
		series.length = times.length;
		this.#rebuild(series, times);
	}

	/** Streaming update of the last row or append of a new row. An older time throws. */
	public updateSeries(series: SeriesStore, time: number, v0: number, v1: number, v2: number, v3: number): UpdateKind {
		const rows = series.length;
		const stride = series.stride;

		if (rows > 0) {
			const lastTime = this.times[series.timeIndexAt(rows - 1)];
			if (time === lastTime) {
				this.#writeRow(series, rows - 1, v0, v1, v2, v3);
				return UpdateKind.InPlace;
			}

			if (time < lastTime) {
				throw new Error(`Cannot update oldest data, last time=${lastTime}, new time=${time}`);
			}
		}

		series.values = grow(series.values, rows * stride, (rows + 1) * stride);
		this.#writeRow(series, rows, v0, v1, v2, v3);

		const timeCount = this.length;
		if (timeCount !== 0 && time <= this.times[timeCount - 1]) {
			const timeIndex = lowerBoundTime(this.times, timeCount, time);
			if (this.times[timeIndex] !== time) {
				// a new time point before the end: all time indexes after it move
				const seriesTimes = new Float64Array(rows + 1);
				for (let row = 0; row < rows; row++) {
					seriesTimes[row] = this.times[series.timeIndexAt(row)];
				}
				seriesTimes[rows] = time;
				series.length = rows + 1;
				this.#rebuild(series, seriesTimes);
				return UpdateKind.Rebuild;
			}

			this.#appendTimeIndex(series, timeIndex);
			return UpdateKind.AppendRow;
		}

		this.times = grow(this.times, timeCount, timeCount + 1);
		this.spans = grow(this.spans, timeCount, timeCount + 1);
		this.times[timeCount] = time;
		this.spans[timeCount] = spanByTime(time, timeCount === 0 ? null : this.times[timeCount - 1]);
		this.length = timeCount + 1;

		this.#appendTimeIndex(series, timeCount);
		return UpdateKind.AppendTime;
	}

	/**
	 * Index of the time point with the given time. With `nearest`, returns the first
	 * time point that is not before `time`, or the last time point.
	 */
	public indexOfTime(time: number, nearest: boolean): number | null {
		if (this.length === 0) {
			return null;
		}

		const index = lowerBoundTime(this.times, this.length, time);
		if (index === this.length) {
			return nearest ? this.length - 1 : null;
		}

		return nearest || this.times[index] === time ? index : null;
	}

	#writeRow(series: SeriesStore, row: number, v0: number, v1: number, v2: number, v3: number): void {
		const values = series.values;
		const offset = row * series.stride;
		values[offset] = v0;
		if (series.stride === 4) {
			values[offset + 1] = v1;
			values[offset + 2] = v2;
			values[offset + 3] = v3;
		}
	}

	#appendTimeIndex(series: SeriesStore, timeIndex: number): void {
		const rows = series.length;
		if (series.index === null) {
			if (rows === 0) {
				series.first = timeIndex;
			} else if (timeIndex !== series.first + rows) {
				// the rows are not at consecutive time indexes any more
				const index = new Int32Array(Math.max(MIN_CAPACITY, rows * 2));
				for (let row = 0; row < rows; row++) {
					index[row] = series.first + row;
				}
				series.index = index;
			}
		}

		if (series.index !== null) {
			series.index = grow(series.index, rows, rows + 1);
			series.index[rows] = timeIndex;
		}

		series.length = rows + 1;
	}

	/** Makes `times` again as the union of the times of all series, then maps each series to it. */
	#rebuild(changed: SeriesStore, changedTimes: Float64Array): void {
		const seriesTimes: Float64Array[] = [];
		let merged: Float64Array = new Float64Array(0);

		for (const series of this.#series) {
			let times: Float64Array;
			if (series === changed) {
				times = changedTimes;
			} else if (series.index === null) {
				times = this.times.slice(series.first, series.first + series.length);
			} else {
				times = new Float64Array(series.length);
				for (let row = 0; row < series.length; row++) {
					times[row] = this.times[series.index[row]];
				}
			}

			seriesTimes.push(times);
			merged = mergeUnique(merged, times);
		}

		// `merged` can be an input array or a view; the store needs its own growable copy
		// only when it is a view of a larger buffer
		this.times = merged.byteOffset === 0 && merged.buffer.byteLength === merged.byteLength ? merged : merged.slice();
		this.length = merged.length;
		this.generation++;

		const spans = new Uint8Array(this.length);
		for (let i = 0; i < this.length; i++) {
			spans[i] = spanByTime(this.times[i], i === 0 ? null : this.times[i - 1]);
		}
		this.spans = spans;

		for (let s = 0; s < this.#series.length; s++) {
			this.#mapSeries(this.#series[s], seriesTimes[s]);
		}
	}

	#mapSeries(series: SeriesStore, seriesTimes: Float64Array): void {
		const rows = series.length;
		series.index = null;
		series.first = 0;
		if (rows === 0) {
			return;
		}

		const times = this.times;
		const first = lowerBoundTime(times, this.length, seriesTimes[0]);
		series.first = first;

		let consecutive = first + rows <= this.length;
		for (let row = 0; consecutive && row < rows; row++) {
			consecutive = times[first + row] === seriesTimes[row];
		}
		if (consecutive) {
			return;
		}

		const index = new Int32Array(rows);
		let timeIndex = first;
		for (let row = 0; row < rows; row++) {
			const time = seriesTimes[row];
			while (times[timeIndex] < time) {
				timeIndex++;
			}
			index[row] = timeIndex;
		}
		series.index = index;
	}
}
