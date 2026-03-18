import { ensureDefined } from '../../helpers/assertions';

interface CachedTick {
	string: string;
	tick: number;
}

export type FormatFunction = (value: Date) => string;

export class FormattedLabelsCache {
	readonly #format: FormatFunction;
	readonly #maxSize: number;
	#actualSize: number = 0;
	#usageTick: number = 1;
	#oldestTick: number = 1;
	#cache: Map<number, CachedTick> = new Map();
	#tick2Labels: Map<number, number> = new Map();

	public constructor(format: FormatFunction, size: number = 50) {
		this.#format = format;
		this.#maxSize = size;
	}

	public format(value: Date): string {
		const tick = this.#cache.get(value.valueOf());
		if (tick !== undefined) {
			return tick.string;
		}

		if (this.#actualSize === this.#maxSize) {
			const oldestValue = this.#tick2Labels.get(this.#oldestTick);
			this.#tick2Labels.delete(this.#oldestTick);
			this.#cache.delete(ensureDefined(oldestValue));
			this.#oldestTick++;
			this.#actualSize--;
		}

		const str = this.#format(value);
		this.#cache.set(value.valueOf(), { string: str, tick: this.#usageTick });
		this.#tick2Labels.set(this.#usageTick, value.valueOf());
		this.#actualSize++;
		this.#usageTick++;
		return str;
	}
}
