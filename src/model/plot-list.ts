import { lowerbound, upperbound } from '../helpers/algorithms';
import { assert, ensureNotNull } from '../helpers/assertions';
import type { Nominal } from '../helpers/nominal';

import type { PlotRow, PlotValue } from '../model/plot-data';
import type { TimePointIndex } from './time-scale/time-data';

export const enum PlotRowSearchMode {
	NearestLeft = -1,
	Exact = 0,
	NearestRight = 1,
}

export type EnumeratingFunction<TimeType, PlotValueTuple extends PlotValue[]> = (index: TimePointIndex, bar: PlotRow<TimeType, PlotValueTuple>) => boolean;

export interface PlotInfo {
	name: string;
	offset: number;
}

export type PlotInfoList = ReadonlyArray<PlotInfo>;

export type PlotFunctionMap<PlotValueTuple extends PlotValue[]> = Map<string, (row: PlotValueTuple) => PlotValue>;

type EmptyValuePredicate<PlotValueTuple extends PlotValue[]> = (value: PlotValueTuple) => boolean;

export interface MinMax {
	min: number;
	max: number;
}

export type PlotRowIndex = Nominal<number, 'PlotRowIndex'>;

// TODO: think about changing it dynamically
const CHUNK_SIZE = 30;

/**
 * PlotList is an array of plot rows
 * each plot row consists of key (index in timescale) and plot value map
 */
export class PlotList<TimeType, PlotValueTuple extends PlotValue[] = PlotValue[]> {
	// TODO: should be renamed to _rows, but the current name is frozen because of myriads of references to it
	#items: PlotRow<TimeType, PlotValueTuple>[] = [];
	// some PlotList instances are just readonly views of sub-range of data stored in another PlotList
	// _start and _end fields are used to implement such views
	#start: number = 0;
	// end is an after-last index
	#end: number = 0;
	#shareRead: boolean = false;
	#minMaxCache: Map<string, Map<number, MinMax | null>> = new Map();
	#rowSearchCache: Map<TimePointIndex, Map<PlotRowSearchMode, PlotRow<TimeType, PlotValueTuple>>> = new Map();
	#rowSearchCacheWithoutEmptyValues: Map<TimePointIndex, Map<PlotRowSearchMode, PlotRow<TimeType, PlotValueTuple>>> = new Map();
	readonly #plotFunctions: PlotFunctionMap<PlotValueTuple>;
	readonly #emptyValuePredicate: EmptyValuePredicate<PlotValueTuple> | null;

	public constructor(plotFunctions: PlotFunctionMap<PlotValueTuple> | null = null, emptyValuePredicate: EmptyValuePredicate<PlotValueTuple> | null = null) {
		this.#plotFunctions = plotFunctions || new Map();
		this.#emptyValuePredicate = emptyValuePredicate;
	}

	public clear(): void {
		this.#items = [];
		this.#start = 0;
		this.#end = 0;
		this.#shareRead = false;
		this.#minMaxCache.clear();
		this.#rowSearchCache.clear();
		this.#rowSearchCacheWithoutEmptyValues.clear();
	}

	// @returns First row
	public first(): PlotRow<TimeType, PlotValueTuple> | null {
		return this.size() > 0 ? this.#items[this.#start as PlotRowIndex] : null;
	}

	// @returns Last row
	public last(): PlotRow<TimeType, PlotValueTuple> | null {
		return this.size() > 0 ? this.#items[(this.#end - 1) as PlotRowIndex] : null;
	}

	public firstIndex(): TimePointIndex | null {
		return this.size() > 0 ? this.#indexAt(this.#start as PlotRowIndex) : null;
	}

	public lastIndex(): TimePointIndex | null {
		return this.size() > 0 ? this.#indexAt((this.#end - 1) as PlotRowIndex) : null;
	}

	public size(): number {
		return this.#end - this.#start;
	}

	public isEmpty(): boolean {
		return this.size() === 0;
	}

	public contains(index: TimePointIndex): boolean {
		return this.#search(index, PlotRowSearchMode.Exact) !== null;
	}

	public valueAt(index: TimePointIndex): PlotRow<TimeType, PlotValueTuple> | null {
		return this.search(index);
	}

	/**
	 * @returns true if new index is added or false if existing index is updated
	 */
	public add(index: TimePointIndex, time: TimeType, value: PlotValueTuple): boolean {
		if (this.#shareRead) {
			return false;
		}

		const row = { index: index, value: value, time: time };
		const pos = this.#search(index, PlotRowSearchMode.Exact);
		this.#rowSearchCache.clear();
		this.#rowSearchCacheWithoutEmptyValues.clear();
		if (pos === null) {
			this.#items.splice(this.#lowerbound(index), 0, row);
			this.#start = 0;
			this.#end = this.#items.length;
			return true;
		} else {
			this.#items[pos] = row;
			return false;
		}
	}

	public search(index: TimePointIndex, searchMode: PlotRowSearchMode = PlotRowSearchMode.Exact, skipEmptyValues?: boolean): PlotRow<TimeType, PlotValueTuple> | null {
		const pos = this.#search(index, searchMode, skipEmptyValues);
		if (pos === null) {
			return null;
		}

		const item = this.#valueAt(pos);

		return {
			index: this.#indexAt(pos),
			time: item.time,
			value: item.value,
		};
	}

	/**
	 * Execute fun on each element.
	 * Stops iteration if callback function returns true.
	 * @param fun Callback function on each element function(index, value): boolean
	 */
	public each(fun: EnumeratingFunction<TimeType, PlotValueTuple>): void {
		for (let i = this.#start; i < this.#end; ++i) {
			const index = this.#indexAt(i as PlotRowIndex);
			const item = this.#valueAt(i as PlotRowIndex);
			if (fun(index, item)) {
				break;
			}
		}
	}

	/**
	 * @returns Readonly collection of elements in range
	 */
	public range(start: TimePointIndex, end: TimePointIndex): PlotList<TimeType, PlotValueTuple> {
		const copy = new PlotList<TimeType, PlotValueTuple>(this.#plotFunctions, this.#emptyValuePredicate);
		copy.#items = this.#items;
		copy.#start = this.#lowerbound(start);
		copy.#end = this.#upperbound(end);

		copy.#shareRead = true;
		return copy;
	}

	public minMaxOnRangeCached(start: TimePointIndex, end: TimePointIndex, plots: PlotInfoList): MinMax | null {
		// this code works for single series only
		// could fail after whitespaces implementation

		if (this.isEmpty()) {
			return null;
		}

		let result: MinMax | null = null;

		for (const plot of plots) {
			const plotMinMax = this.#minMaxOnRangeCachedImpl(start, end, plot);
			result = mergeMinMax(result, plotMinMax);
		}

		return result;
	}

	public merge(plotRows: ReadonlyArray<PlotRow<TimeType, PlotValueTuple>>): PlotRow<TimeType, PlotValueTuple> | null {
		if (this.#shareRead) {
			return null;
		}

		if (plotRows.length === 0) {
			return null;
		}

		// if we get a bunch of history - just prepend it
		if (this.isEmpty() || plotRows[plotRows.length - 1].index < this.#items[0].index) {
			return this.#prepend(plotRows);
		}

		// if we get new rows - just append it
		if (plotRows[0].index > this.#items[this.#items.length - 1].index) {
			return this.#append(plotRows);
		}

		// if we get update for the last row - just replace it
		if (plotRows.length === 1 && plotRows[0].index === this.#items[this.#items.length - 1].index) {
			this.#updateLast(plotRows[0]);
			return plotRows[0];
		}

		return this.#merge(plotRows);
	}

	public remove(start: TimePointIndex): PlotRow<TimeType, PlotValueTuple> | null {
		if (this.#shareRead) {
			return null;
		}

		const startOffset = this.#search(start, PlotRowSearchMode.NearestRight);
		if (startOffset === null) {
			return null;
		}

		const removedPlotRows = this.#items.splice(startOffset);
		// _start should never be modified in this method
		this.#end = this.#items.length;

		this.#minMaxCache.clear();
		this.#rowSearchCache.clear();
		this.#rowSearchCacheWithoutEmptyValues.clear();

		return removedPlotRows.length > 0 ? removedPlotRows[0] : null;
	}

	#indexAt(offset: PlotRowIndex): TimePointIndex {
		return this.#items[offset].index;
	}

	#valueAt(offset: PlotRowIndex): PlotRow<TimeType, PlotValueTuple> {
		return this.#items[offset];
	}

	#search(index: TimePointIndex, searchMode: PlotRowSearchMode, skipEmptyValues?: boolean): PlotRowIndex | null {
		const exactPos = this.#bsearch(index);

		if (exactPos === null && searchMode !== PlotRowSearchMode.Exact) {
			switch (searchMode) {
				case PlotRowSearchMode.NearestLeft:
					return this.#searchNearestLeft(index, skipEmptyValues);
				case PlotRowSearchMode.NearestRight:
					return this.#searchNearestRight(index, skipEmptyValues);
				default:
					throw new TypeError('Unknown search mode');
			}
		}

		// there is a found value or search mode is Exact

		if (!skipEmptyValues || exactPos === null || searchMode === PlotRowSearchMode.Exact) {
			return exactPos;
		}

		// skipEmptyValues is true, additionally check for emptiness
		switch (searchMode) {
			case PlotRowSearchMode.NearestLeft:
				return this.#nonEmptyNearestLeft(exactPos);
			case PlotRowSearchMode.NearestRight:
				return this.#nonEmptyNearestRight(exactPos);
			default:
				throw new TypeError('Unknown search mode');
		}
	}

	#nonEmptyNearestRight(index: PlotRowIndex): PlotRowIndex | null {
		const predicate = ensureNotNull(this.#emptyValuePredicate);
		while (index < this.#end && predicate(this.#valueAt(index).value)) {
			index = index + 1 as PlotRowIndex;
		}

		return index === this.#end ? null : index;
	}

	#nonEmptyNearestLeft(index: PlotRowIndex): PlotRowIndex | null {
		const predicate = ensureNotNull(this.#emptyValuePredicate);
		while (index >= this.#start && predicate(this.#valueAt(index).value)) {
			index = index - 1 as PlotRowIndex;
		}

		return index < this.#start ? null : index;
	}

	#searchNearestLeft(index: TimePointIndex, skipEmptyValues?: boolean): PlotRowIndex | null {
		let nearestLeftPos = this.#lowerbound(index);
		if (nearestLeftPos > this.#start) {
			nearestLeftPos = nearestLeftPos - 1;
		}

		const result = (nearestLeftPos !== this.#end && this.#indexAt(nearestLeftPos as PlotRowIndex) < index) ? nearestLeftPos as PlotRowIndex : null;
		if (skipEmptyValues && result !== null) {
			return this.#nonEmptyNearestLeft(result);
		}

		return result;
	}

	#searchNearestRight(index: TimePointIndex, skipEmptyValues?: boolean): PlotRowIndex | null {
		const nearestRightPos = this.#upperbound(index);
		const result = (nearestRightPos !== this.#end && index < this.#indexAt(nearestRightPos as PlotRowIndex)) ? nearestRightPos as PlotRowIndex : null;

		if (skipEmptyValues && result !== null) {
			return this.#nonEmptyNearestRight(result);
		}

		return result;
	}

	#bsearch(index: TimePointIndex): PlotRowIndex | null {
		const start = this.#lowerbound(index);
		if (start !== this.#end && !(index < this.#items[start as PlotRowIndex].index)) {
			return start as PlotRowIndex;
		}

		return null;
	}

	#lowerbound(index: TimePointIndex): number {
		return lowerbound(
			this.#items,
			index,
			(a: PlotRow<TimeType, PlotValueTuple>, b: TimePointIndex) => { return a.index < b; },
			this.#start,
			this.#end
		);
	}

	#upperbound(index: TimePointIndex): number {
		return upperbound(
			this.#items,
			index,
			(a: TimePointIndex, b: PlotRow<TimeType, PlotValueTuple>) => { return b.index > a; },
			this.#start,
			this.#end
		);
	}

	/**
	 * @param endIndex Non-inclusive end
	 */
	#plotMinMax(startIndex: PlotRowIndex, endIndex: PlotRowIndex, plot: PlotInfo): MinMax | null {
		let result: MinMax | null = null;

		const func = this.#plotFunctions.get(plot.name);

		if (func === undefined) {
			throw new Error(`Plot "${plot.name}" is not registered`);
		}

		for (let i = startIndex; i < endIndex; i++) {
			const values = this.#items[i].value;

			const v = func(values);
			if (v === undefined || v === null || Number.isNaN(v)) {
				continue;
			}

			if (result === null) {
				result = { min: v, max: v };
			} else {
				if (v < result.min) {
					result.min = v;
				}

				if (v > result.max) {
					result.max = v;
				}
			}
		}

		return result;
	}

	#invalidateCacheForRow(row: PlotRow<TimeType, PlotValueTuple>): void {
		const chunkIndex = Math.floor(row.index / CHUNK_SIZE);
		this.#minMaxCache.forEach((cacheItem: Map<number, MinMax | null>) => cacheItem.delete(chunkIndex));
	}

	#prepend(plotRows: ReadonlyArray<PlotRow<TimeType, PlotValueTuple>>): PlotRow<TimeType, PlotValueTuple> {
		assert(!this.#shareRead, 'collection should not be readonly');
		assert(plotRows.length !== 0, 'plotRows should not be empty');

		this.#rowSearchCache.clear();
		this.#rowSearchCacheWithoutEmptyValues.clear();
		this.#minMaxCache.clear();

		this.#items = plotRows.concat(this.#items);

		this.#start = 0;
		this.#end = this.#items.length;

		return plotRows[0];
	}

	#append(plotRows: ReadonlyArray<PlotRow<TimeType, PlotValueTuple>>): PlotRow<TimeType, PlotValueTuple> {
		assert(!this.#shareRead, 'collection should not be readonly');
		assert(plotRows.length !== 0, 'plotRows should not be empty');

		this.#rowSearchCache.clear();
		this.#rowSearchCacheWithoutEmptyValues.clear();
		this.#minMaxCache.clear();

		this.#items = this.#items.concat(plotRows);

		this.#start = 0;
		this.#end = this.#items.length;

		return plotRows[0];
	}

	#updateLast(plotRow: PlotRow<TimeType, PlotValueTuple>): void {
		assert(!this.isEmpty(), 'plot list should not be empty');
		const currentLastRow = this.#items[this.#end - 1];
		assert(currentLastRow.index === plotRow.index, 'last row index should match new row index');

		this.#invalidateCacheForRow(plotRow);
		this.#rowSearchCache.delete(plotRow.index);
		this.#rowSearchCacheWithoutEmptyValues.delete(plotRow.index);

		this.#items[this.#end - 1] = plotRow;
	}

	#merge(plotRows: ReadonlyArray<PlotRow<TimeType, PlotValueTuple>>): PlotRow<TimeType, PlotValueTuple> {
		assert(plotRows.length !== 0, 'plot rows should not be empty');

		this.#rowSearchCache.clear();
		this.#rowSearchCacheWithoutEmptyValues.clear();
		this.#minMaxCache.clear();

		this.#items = mergePlotRows(this.#items, plotRows);

		this.#start = 0;
		this.#end = this.#items.length;

		return plotRows[0];
	}

	#minMaxOnRangeCachedImpl(start: TimePointIndex, end: TimePointIndex, plotInfo: PlotInfo): MinMax | null {
		// this code works for single series only
		// could fail after whitespaces implementation

		if (this.isEmpty()) {
			return null;
		}

		let result: MinMax | null = null;

		// assume that bar indexes only increase
		const firstIndex = ensureNotNull(this.firstIndex());
		const lastIndex = ensureNotNull(this.lastIndex());

		let s = start - plotInfo.offset;
		let e = end - plotInfo.offset;
		s = Math.max(s, firstIndex);
		e = Math.min(e, lastIndex);

		const cachedLow = Math.ceil(s / CHUNK_SIZE) * CHUNK_SIZE;
		const cachedHigh = Math.max(cachedLow, Math.floor(e / CHUNK_SIZE) * CHUNK_SIZE);

		{
			const startIndex = this.#lowerbound(s as TimePointIndex);
			const endIndex = this.#upperbound(Math.min(e, cachedLow, end) as TimePointIndex); // non-inclusive end
			const plotMinMax = this.#plotMinMax(startIndex as PlotRowIndex, endIndex as PlotRowIndex, plotInfo);
			result = mergeMinMax(result, plotMinMax);
		}

		let minMaxCache = this.#minMaxCache.get(plotInfo.name);

		if (minMaxCache === undefined) {
			minMaxCache = new Map();
			this.#minMaxCache.set(plotInfo.name, minMaxCache);
		}

		// now go cached
		for (let c = Math.max(cachedLow + 1, s); c < cachedHigh; c += CHUNK_SIZE) {
			const chunkIndex = Math.floor(c / CHUNK_SIZE);

			let chunkMinMax = minMaxCache.get(chunkIndex);
			if (chunkMinMax === undefined) {
				const chunkStart = this.#lowerbound(chunkIndex * CHUNK_SIZE as TimePointIndex);
				const chunkEnd = this.#upperbound((chunkIndex + 1) * CHUNK_SIZE - 1 as TimePointIndex);
				chunkMinMax = this.#plotMinMax(chunkStart as PlotRowIndex, chunkEnd as PlotRowIndex, plotInfo);
				minMaxCache.set(chunkIndex, chunkMinMax);
			}

			result = mergeMinMax(result, chunkMinMax);
		}

		// tail
		{
			const startIndex = this.#lowerbound(cachedHigh as TimePointIndex);
			const endIndex = this.#upperbound(e as TimePointIndex); // non-inclusive end
			const plotMinMax = this.#plotMinMax(startIndex as PlotRowIndex, endIndex as PlotRowIndex, plotInfo);
			result = mergeMinMax(result, plotMinMax);
		}

		return result;
	}
}

export function mergeMinMax(first: MinMax | null, second: MinMax | null): MinMax | null {
	if (first === null) {
		return second;
	} else {
		if (second === null) {
			return first;
		} else {
			// merge MinMax values
			const min = Math.min(first.min, second.min);
			const max = Math.max(first.max, second.max);
			return { min: min, max: max };
		}
	}
}

/**
 * Merges two ordered plot row arrays and returns result (ordered plot row array).
 *
 * BEWARE: If row indexes from plot rows are equal, the new plot row is used.
 *
 * NOTE: Time and memory complexity are O(N+M).
 */
export function mergePlotRows<TimeType, PlotValueTuple extends PlotValue[] = PlotValue[]>(originalPlotRows: ReadonlyArray<PlotRow<TimeType, PlotValueTuple>>, newPlotRows: ReadonlyArray<PlotRow<TimeType, PlotValueTuple>>): PlotRow<TimeType, PlotValueTuple>[] {
	const newArraySize = calcMergedArraySize(originalPlotRows, newPlotRows);

	const result = new Array<PlotRow<TimeType, PlotValueTuple>>(newArraySize);

	let originalRowsIndex = 0;
	let newRowsIndex = 0;
	const originalRowsSize = originalPlotRows.length;
	const newRowsSize = newPlotRows.length;
	let resultRowsIndex = 0;

	while (originalRowsIndex < originalRowsSize && newRowsIndex < newRowsSize) {
		if (originalPlotRows[originalRowsIndex].index < newPlotRows[newRowsIndex].index) {
			result[resultRowsIndex] = originalPlotRows[originalRowsIndex];
			originalRowsIndex++;
		} else if (originalPlotRows[originalRowsIndex].index > newPlotRows[newRowsIndex].index) {
			result[resultRowsIndex] = newPlotRows[newRowsIndex];
			newRowsIndex++;
		} else {
			result[resultRowsIndex] = newPlotRows[newRowsIndex];
			originalRowsIndex++;
			newRowsIndex++;
		}

		resultRowsIndex++;
	}

	while (originalRowsIndex < originalRowsSize) {
		result[resultRowsIndex] = originalPlotRows[originalRowsIndex];
		originalRowsIndex++;
		resultRowsIndex++;
	}

	while (newRowsIndex < newRowsSize) {
		result[resultRowsIndex] = newPlotRows[newRowsIndex];
		newRowsIndex++;
		resultRowsIndex++;
	}

	return result;
}

function calcMergedArraySize<TimeType, PlotValueTuple extends PlotValue[] = PlotValue[]>(
	firstPlotRows: ReadonlyArray<PlotRow<TimeType, PlotValueTuple>>,
	secondPlotRows: ReadonlyArray<PlotRow<TimeType, PlotValueTuple>>): number {
	const firstPlotsSize = firstPlotRows.length;
	const secondPlotsSize = secondPlotRows.length;

	// new plot rows size is (first plot rows size) + (second plot rows size) - common part size
	// in this case we can just calculate common part size
	let result = firstPlotsSize + secondPlotsSize;

	// TODO: we can move first/second indexes to the right and first/second size to lower/upper bound of opposite array
	// to skip checking uncommon parts
	let firstIndex = 0;
	let secondIndex = 0;

	while (firstIndex < firstPlotsSize && secondIndex < secondPlotsSize) {
		if (firstPlotRows[firstIndex].index < secondPlotRows[secondIndex].index) {
			firstIndex++;
		} else if (firstPlotRows[firstIndex].index > secondPlotRows[secondIndex].index) {
			secondIndex++;
		} else {
			firstIndex++;
			secondIndex++;
			result--;
		}
	}

	return result;
}
