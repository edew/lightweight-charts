import { ensureDefined } from '../../helpers/assertions';

import type { TickMark, TimePoint } from './time-data';

function sortByIndexAsc(a: TickMark, b: TickMark): number {
	return a.index - b.index;
}

export class TickMarks {
	#minIndex: number = Infinity;
	#maxIndex: number = -Infinity;

	// Hash of tick marks
	#marksByIndex: Map<number, TickMark> = new Map();
	// Sparse array with ordered arrays of tick marks
	#marksBySpan: Map<number, TickMark[]> = new Map();
	#cache: TickMark[] | null = null;
	#minIndexesBetweenMarksCount: number = NaN;

	public reset(): void {
		this.#marksByIndex.clear();
		this.#marksBySpan.clear();
		this.#minIndex = Infinity;
		this.#maxIndex = -Infinity;
		this.#cache = null;
	}

	public merge(tickMarks: TickMark[]): void {
		const marksBySpan = this.#marksBySpan;
		const unsortedSpans: Record<number, boolean> = {};

		for (const tickMark of tickMarks) {
			const index = tickMark.index;
			const span = tickMark.span;

			const existingTickMark = this.#marksByIndex.get(tickMark.index);
			if (existingTickMark) {
				if (existingTickMark.index === tickMark.index && existingTickMark.span === tickMark.span) {
					// We don't need to do anything, just update time (if it differs)
					existingTickMark.time = tickMark.time;
					continue;
				}

				// TickMark exists, but it differs. We need to remove it first
				this.#removeTickMark(existingTickMark);
			}

			// Set into hash
			this.#marksByIndex.set(index, tickMark);
			if (this.#minIndex > index) { // It's not the same as `this.minIndex > index`, mind the NaN
				this.#minIndex = index;
			}

			if (this.#maxIndex < index) {
				this.#maxIndex = index;
			}

			// Store it in span arrays
			let marks = marksBySpan.get(span);
			if (marks === undefined) {
				marks = [];
				marksBySpan.set(span, marks);
			}

			marks.push(tickMark);
			unsortedSpans[span] = true;
		}

		// Clean up and sort arrays
		for (const [span, marks] of marksBySpan) {
			if (marks === undefined) {
				continue;
			}

			if (marks.length === 0) {
				marksBySpan.delete(span);
			}

			if (unsortedSpans[span]) {
				marks.sort(sortByIndexAsc);
			}
		}

		this.#cache = null;
	}

	public indexToTime(index: number): TimePoint | null {
		const tickMark = this.#marksByIndex.get(index);
		if (tickMark === undefined) {
			return null;
		}

		return tickMark.time;
	}

	public build(spacing: number, maxWidth: number): TickMark[] {
		// maxWidth is the pixel width of the widest label; spacing is pixels per bar index.
		// Dividing gives the label's footprint in bar-index units: how many bar indices
		// one label spans on screen. Two marks must be at least this far apart (in indices)
		// or their labels will overlap.
		const minIndexesBetweenMarksCount = Math.ceil(maxWidth / spacing);
		if (this.#minIndexesBetweenMarksCount === minIndexesBetweenMarksCount && this.#cache) {
			return this.#cache;
		}

		this.#minIndexesBetweenMarksCount = minIndexesBetweenMarksCount;

		// Multi-pass filtering across span levels (e.g., daily -> 12-hourly -> hourly).
		// Each pass tries to fill in smaller marks between already-accepted bigger marks,
		// keeping only candidates that satisfy the minimum spacing on both sides.
		let acceptedMarks: TickMark[] = [];
		for (const currentSpanMarks of this.#marksBySpan.values()) {
			const previouslyAccepted = acceptedMarks;
			acceptedMarks = [];

			const previouslyAcceptedLength = previouslyAccepted.length;
			let acceptedIdx = 0;
			const currentSpanLength = currentSpanMarks.length;

			let rightNeighborIndex = Infinity;
			let leftNeighborIndex = -Infinity;
			for (let i = 0; i < currentSpanLength; i++) {
				const candidate = currentSpanMarks[i];
				const candidateIndex = candidate.index;

				// Merge previously-accepted marks that lie to the left of the candidate,
				// and find the nearest left and right neighbors for spacing validation.
				while (acceptedIdx < previouslyAcceptedLength) {
					const acceptedMark = previouslyAccepted[acceptedIdx];
					const acceptedIndex = acceptedMark.index;
					if (acceptedIndex < candidateIndex) {
						// This accepted mark is to the left — keep it and update left boundary
						acceptedIdx++;
						acceptedMarks.push(acceptedMark);
						leftNeighborIndex = acceptedIndex;
						rightNeighborIndex = Infinity;
					} else {
						// This accepted mark is at or to the right — it becomes the right boundary
						rightNeighborIndex = acceptedIndex;
						break;
					}
				}

				// Include the candidate only if neither neighbor's label would overlap with it.
				// The distance in bar indices must be >= the label footprint on each side.
				const hasSpaceOnRight = rightNeighborIndex - candidateIndex >= minIndexesBetweenMarksCount;
				const hasSpaceOnLeft = candidateIndex - leftNeighborIndex >= minIndexesBetweenMarksCount;
				if (hasSpaceOnRight && hasSpaceOnLeft) {
					acceptedMarks.push(candidate);
					leftNeighborIndex = candidateIndex;
				}
			}

			// Append remaining previously-accepted marks that were to the right of all candidates
			for (; acceptedIdx < previouslyAcceptedLength; acceptedIdx++) {
				acceptedMarks.push(previouslyAccepted[acceptedIdx]);
			}
		}

		this.#cache = acceptedMarks;
		return this.#cache;
	}

	#removeTickMark(tickMark: TickMark): void {
		const index = tickMark.index;
		if (this.#marksByIndex.get(index) !== tickMark) {
			return;
		}

		this.#marksByIndex.delete(index);
		if (index <= this.#minIndex) {
			this.#minIndex++;
		}

		if (index >= this.#maxIndex) {
			this.#maxIndex--;
		}

		if (this.#maxIndex < this.#minIndex) {
			this.#minIndex = Infinity;
			this.#maxIndex = -Infinity;
		}

		const spanArray = ensureDefined(this.#marksBySpan.get(tickMark.span));
		const position = spanArray.indexOf(tickMark);
		if (position !== -1) {
			// Keeps array sorted
			spanArray.splice(position, 1);
		}
	}
}
