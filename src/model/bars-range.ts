import type { TimePointIndex } from './time-scale/time-data';

/** A range of time point indexes; `first` and `last` are in the range. An object of this type does not change. */
export interface BarsRange {
	readonly first: TimePointIndex;
	readonly last: TimePointIndex;
}
