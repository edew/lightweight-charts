import { isNumber, isString } from '../helpers/strict-type-checks';

import type { BusinessDay, UTCTimestamp } from '../model/time-scale/time-data';

export type Time = UTCTimestamp | BusinessDay | string;

export function isBusinessDay(time: Time): time is BusinessDay {
	return !isNumber(time) && !isString(time);
}

export function isUTCTimestamp(time: Time): time is UTCTimestamp {
	return isNumber(time);
}

/**
 * Structure describing single data item for series of type Line or Area
 */
export interface LineData {
	time: Time;

	/**
	 * Price value of data item
	 */
	value: number;
}

export interface BarData {
	time: Time;

	open: number;
	high: number;
	low: number;
	close: number;
}

export interface SeriesDataItemTypeMap {
	Candlestick: BarData;
	Line: LineData;
}
