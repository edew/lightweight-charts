export type FormatFunction = (value: number) => string;

/**
 * Remembers the text for the last values. When the cache is full, the value that was
 * added first is removed.
 */
export class FormattedLabelsCache {
	readonly #format: FormatFunction;
	readonly #maxSize: number;
	// a Map keeps the order in which the keys were added
	readonly #cache: Map<number, string> = new Map();

	public constructor(format: FormatFunction, size: number = 50) {
		this.#format = format;
		this.#maxSize = size;
	}

	public format(value: number): string {
		let text = this.#cache.get(value);
		if (text !== undefined) {
			return text;
		}

		if (this.#cache.size === this.#maxSize) {
			this.#cache.delete(this.#cache.keys().next().value as number);
		}

		text = this.#format(value);
		this.#cache.set(value, text);
		return text;
	}
}
