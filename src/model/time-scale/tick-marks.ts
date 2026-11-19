// Selects the time points that get a label on the time axis.
//
// Each time point has a weight (span): year > month > day > hour steps > minute steps.
// Marks with a higher weight are placed first. A mark with a lower weight is accepted
// only when it is far enough from all accepted marks. In each weight, the marks are
// tried from left to right.

export interface TickMarksResult {
	/** Accepted time indexes, in ascending order. Only the first `count` items are valid. */
	indexes: Int32Array;
	count: number;
}

/**
 * New time points at the end can change accepted marks only near the end: one
 * minimum distance for the new mark with the highest weight, and one more for each
 * lower weight that then gets or loses space. This is more than the number of weights.
 */
const AFFECTED_DISTANCES = 16;

export class TickMarks {
	readonly #result: TickMarksResult = { indexes: new Int32Array(0), count: 0 };
	#suffix: Int32Array = new Int32Array(64);
	#scratch: Int32Array = new Int32Array(64);
	#minIndexesBetweenMarks: number = NaN;
	#length: number = 0;
	#generation: number = -1;

	/**
	 * @param spans - weight for each time point
	 * @param length - number of time points
	 * @param generation - changes when existing time points change. It does not change
	 * when time points are only added at the end.
	 * @param spacing - pixels for each time point
	 * @param maxWidth - pixel width of the widest label
	 */
	public build(spans: Uint8Array, length: number, generation: number, spacing: number, maxWidth: number): TickMarksResult {
		// two marks must be at least this number of time points apart, or their labels overlap
		const minDistance = Math.ceil(maxWidth / spacing);
		const result = this.#result;

		let start = 0;
		if (this.#minIndexesBetweenMarks === minDistance && this.#generation === generation && length >= this.#length) {
			if (length === this.#length) {
				return result;
			}
			// only new time points at the end: the marks before `start` stay as they are
			start = Math.max(0, this.#length - AFFECTED_DISTANCES * minDistance);
		}

		this.#minIndexesBetweenMarks = minDistance;
		this.#generation = generation;
		this.#length = length;

		// keep the accepted marks before `start`
		const prefix = result.indexes;
		let prefixCount = 0;
		if (start > 0) {
			let end = result.count;
			while (prefixCount < end) {
				const mid = (prefixCount + end) >> 1;
				if (prefix[mid] < start) {
					prefixCount = mid + 1;
				} else {
					end = mid;
				}
			}
		}

		// which weights are present in the part to build
		const present = new Uint8Array(256);
		for (let i = start; i < length; i++) {
			present[spans[i]] = 1;
		}

		let accepted = this.#suffix;
		let acceptedCount = 0;
		let next = this.#scratch;

		for (let span = 255; span >= 0; span--) {
			if (present[span] === 0) {
				continue;
			}

			// the nearest kept mark that this weight cannot be near to
			let leftNeighbor = -Infinity;
			for (let i = prefixCount - 1; i >= 0; i--) {
				if (spans[prefix[i]] >= span) {
					leftNeighbor = prefix[i];
					break;
				}
			}

			// merge the candidates of this weight into the marks that are already accepted
			let nextCount = 0;
			let acceptedPosition = 0;
			let rightNeighbor = Infinity;

			for (let candidate = start; candidate < length; candidate++) {
				if (spans[candidate] !== span) {
					continue;
				}

				while (acceptedPosition < acceptedCount) {
					const acceptedIndex = accepted[acceptedPosition];
					if (acceptedIndex < candidate) {
						acceptedPosition++;
						next = push(next, nextCount++, acceptedIndex);
						leftNeighbor = acceptedIndex;
						rightNeighbor = Infinity;
					} else {
						rightNeighbor = acceptedIndex;
						break;
					}
				}

				if (rightNeighbor - candidate >= minDistance && candidate - leftNeighbor >= minDistance) {
					next = push(next, nextCount++, candidate);
					leftNeighbor = candidate;
				}
			}

			for (; acceptedPosition < acceptedCount; acceptedPosition++) {
				next = push(next, nextCount++, accepted[acceptedPosition]);
			}

			const swap = accepted;
			accepted = next;
			acceptedCount = nextCount;
			next = swap;
		}

		this.#suffix = accepted;
		this.#scratch = next;

		// the result is the kept marks and then the new marks
		const total = prefixCount + acceptedCount;
		if (result.indexes.length < total) {
			const larger = new Int32Array(Math.max(total, result.indexes.length * 2, 64));
			larger.set(result.indexes.subarray(0, prefixCount));
			result.indexes = larger;
		}
		result.indexes.set(accepted.subarray(0, acceptedCount), prefixCount);
		result.count = total;
		return result;
	}
}

function push(array: Int32Array, position: number, value: number): Int32Array {
	if (position >= array.length) {
		const larger = new Int32Array(array.length * 2);
		larger.set(array);
		array = larger;
	}
	array[position] = value;
	return array;
}
