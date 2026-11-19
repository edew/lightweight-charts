/// <reference types="_build-time-constants" />

// Conversion between the time types of the public API and UTC seconds.
// Inside the library a time is always a number of UTC seconds.

import { isString } from '../helpers/strict-type-checks';

import type { SortedTimes } from '../model/data-store';
import type { BusinessDay, UTCTimestamp } from '../model/time-scale/time-data';

import { type BarData, isBusinessDay, isUTCTimestamp, type LineData, type Time } from './data-consumer';

const validDateRegex = /^\d\d\d\d-\d\d-\d\d$/;

export function stringToBusinessDay(value: string): BusinessDay {
	if (process.env.NODE_ENV === 'development') {
		// in some browsers the Date constructor accepts invalid date strings
		// and parses them in an "implementation specific" way
		// (for example 2019-1-1 is not the same as 2019-01-01)
		if (!validDateRegex.test(value)) {
			throw new Error(`Invalid date string=${value}, expected format=yyyy-mm-dd`);
		}
	}

	const d = new Date(value);
	if (isNaN(d.getTime())) {
		throw new Error(`Invalid date string=${value}, expected format=yyyy-mm-dd`);
	}

	return {
		day: d.getUTCDate(),
		month: d.getUTCMonth() + 1,
		year: d.getUTCFullYear(),
	};
}

function businessDayToSeconds(day: BusinessDay): number {
	return Math.round(Date.UTC(day.year, day.month - 1, day.day, 0, 0, 0, 0) / 1000);
}

/** Converts any public time value to UTC seconds. */
export function timeToSeconds(time: Time): number {
	if (isUTCTimestamp(time)) {
		return time;
	}

	return businessDayToSeconds(isString(time) ? stringToBusinessDay(time) : time);
}

/** Converts UTC seconds to the time type that the user gave to the chart. */
export function secondsToTime(seconds: number, businessDay: boolean): UTCTimestamp | BusinessDay {
	if (!businessDay) {
		return seconds as UTCTimestamp;
	}

	const d = new Date(seconds * 1000);
	return {
		year: d.getUTCFullYear(),
		month: d.getUTCMonth() + 1,
		day: d.getUTCDate(),
	};
}

/** Converts one time of a data item. All items of a chart must have the same type of time. */
export function itemTimeToSeconds(time: Time, businessDay: boolean): number {
	if (businessDay) {
		if (isUTCTimestamp(time)) {
			throw new Error('time must be of type BusinessDay');
		}
		return businessDayToSeconds(isString(time) ? stringToBusinessDay(time) : time);
	}

	if (!isUTCTimestamp(time)) {
		throw new Error('time must be of type isUTCTimestamp');
	}
	return time;
}

export function isBusinessDayTime(time: Time): boolean {
	return isString(time) || isBusinessDay(time);
}

export interface ConvertedSeriesData {
	times: SortedTimes;
	/** `stride` values for each time. */
	values: Float64Array;
	businessDay: boolean;
}

/**
 * Copies the data items of the user into typed arrays. The items are not changed and
 * not kept. If two items have the same time, the last one wins.
 *
 * @param timeType - true if each time must be a business day, false if each time must
 * be a timestamp, null if the first item gives the type
 */
export function convertSeriesData(stride: number, data: readonly (LineData | BarData)[], timeType: boolean | null = null): ConvertedSeriesData {
	const count = data.length;
	const businessDay = timeType ?? (count !== 0 && isBusinessDayTime(data[0].time));
	const times = new Float64Array(count);
	const values = new Float64Array(count * stride);

	let sorted = true;
	for (let i = 0; i < count; i++) {
		const item = data[i];
		const time = itemTimeToSeconds(item.time, businessDay);
		times[i] = time;
		if (i !== 0 && time <= times[i - 1]) {
			sorted = false;
		}

		if (stride === 1) {
			values[i] = (item as LineData).value;
		} else {
			const bar = item as BarData;
			const offset = i * 4;
			values[offset] = bar.open;
			values[offset + 1] = bar.high;
			values[offset + 2] = bar.low;
			values[offset + 3] = bar.close;
		}
	}

	if (sorted) {
		return { times: times as SortedTimes, values, businessDay };
	}

	// slow path: the input is not in order or has duplicate times
	const order = new Uint32Array(count);
	for (let i = 0; i < count; i++) {
		order[i] = i;
	}
	// equal times keep the input order, so the last one is the last duplicate
	order.sort((a: number, b: number) => times[a] - times[b] || a - b);

	const sortedTimes = new Float64Array(count);
	const sortedValues = new Float64Array(count * stride);
	let out = 0;
	for (let i = 0; i < count; i++) {
		const source = order[i];
		if (out !== 0 && sortedTimes[out - 1] === times[source]) {
			out--;
		}
		sortedTimes[out] = times[source];
		for (let k = 0; k < stride; k++) {
			sortedValues[out * stride + k] = values[source * stride + k];
		}
		out++;
	}

	return { times: sortedTimes.slice(0, out) as SortedTimes, values: sortedValues.slice(0, out * stride), businessDay };
}
