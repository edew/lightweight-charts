import { assert } from '../helpers/assertions';

import type { TimePointIndex } from './time-scale/time-data';

export class BarsRange {
	readonly #firstBar: TimePointIndex;
	readonly #lastBar: TimePointIndex;

	public constructor(firstBar: TimePointIndex, lastBar: TimePointIndex) {
		assert(firstBar <= lastBar, 'The last bar in the bars range should be greater than or equal to the first bar');

		this.#firstBar = firstBar;
		this.#lastBar = lastBar;
	}

	public firstBar(): TimePointIndex {
		return this.#firstBar;
	}

	public lastBar(): TimePointIndex {
		return this.#lastBar;
	}

	public count(): number {
		return this.#lastBar - this.#firstBar + 1;
	}

	public contains(index: TimePointIndex): boolean {
		return this.#firstBar <= index && index <= this.#lastBar;
	}

	public equals(other: BarsRange): boolean {
		return this.#firstBar === other.firstBar() && this.#lastBar === other.lastBar();
	}
}
