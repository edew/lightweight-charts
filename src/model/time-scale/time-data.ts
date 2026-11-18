import type { Nominal } from '../../helpers/nominal';

export type UTCTimestamp = Nominal<number, 'UTCTimestamp'>;

export interface BusinessDay {
	year: number;
	month: number;
	day: number;
}

/** A range of time, in UTC seconds. */
export interface TimeSecondsRange {
	from: number;
	to: number;
}

export type TimePointIndex = Nominal<number, 'TimePointIndex'>;

export function secondsToBusinessDay(seconds: number): BusinessDay {
	const d = new Date(seconds * 1000);
	return {
		year: d.getUTCFullYear(),
		month: d.getUTCMonth() + 1,
		day: d.getUTCDate(),
	};
}
