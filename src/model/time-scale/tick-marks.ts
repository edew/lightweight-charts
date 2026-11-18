// Selects the time points that get a label on the time axis.
//
// Each time point has a weight (span): year > month > day > hour steps > minute steps.
// Marks with a higher weight are placed first. A mark with a lower weight is accepted
// only when it is far enough from all accepted marks.

export interface TickMarksResult {
	/** Accepted time indexes, in ascending order. Only the first `count` items are valid. */
	indexes: Int32Array;
	count: number;
}

export class TickMarks {
	#result: TickMarksResult = { indexes: new Int32Array(0), count: 0 };
	#scratch: Int32Array = new Int32Array(0);
	#valid: boolean = false;
	#minIndexesBetweenMarks: number = NaN;
	#spans: Uint8Array | null = null;
	#length: number = -1;
	#version: number = -1;

	public reset(): void {
		this.#valid = false;
	}

	/**
	 * @param spans - weight for each time point
	 * @param length - number of time points
	 * @param version - changes when the time points change
	 * @param spacing - pixels for each time point
	 * @param maxWidth - pixel width of the widest label
	 */
	public build(spans: Uint8Array, length: number, version: number, spacing: number, maxWidth: number): TickMarksResult {
		// two marks must be at least this number of time points apart, or their labels overlap
		const minIndexesBetweenMarks = Math.ceil(maxWidth / spacing);
		if (
			this.#valid &&
			this.#minIndexesBetweenMarks === minIndexesBetweenMarks &&
			this.#spans === spans &&
			this.#length === length &&
			this.#version === version
		) {
			return this.#result;
		}

		this.#minIndexesBetweenMarks = minIndexesBetweenMarks;
		this.#spans = spans;
		this.#length = length;
		this.#version = version;
		this.#valid = true;

		// which weights are present
		const present = new Uint8Array(256);
		for (let i = 0; i < length; i++) {
			present[spans[i]] = 1;
		}

		let accepted = this.#result.indexes;
		let acceptedCount = 0;
		let next = this.#scratch;

		for (let span = 255; span >= 0; span--) {
			if (present[span] === 0) {
				continue;
			}

			// merge the candidates of this weight into the marks that are already accepted
			let nextCount = 0;
			let acceptedPosition = 0;
			let leftNeighbor = -Infinity;
			let rightNeighbor = Infinity;

			for (let candidate = 0; candidate < length; candidate++) {
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

				if (rightNeighbor - candidate >= minIndexesBetweenMarks && candidate - leftNeighbor >= minIndexesBetweenMarks) {
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

		this.#scratch = next;
		this.#result = { indexes: accepted, count: acceptedCount };
		return this.#result;
	}
}

function push(array: Int32Array, position: number, value: number): Int32Array {
	if (position >= array.length) {
		const larger = new Int32Array(Math.max(64, array.length * 2));
		larger.set(array);
		array = larger;
	}
	array[position] = value;
	return array;
}
