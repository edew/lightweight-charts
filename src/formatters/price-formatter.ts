import { isInteger, isNumber } from '../helpers/strict-type-checks';

import type { IPriceFormatter } from './iformatter';

/**
 * Formats a price with a fixed number of decimal places, rounded to the minimum move.
 */
export class PriceFormatter implements IPriceFormatter {
	/** Number of steps of the minimum move in one unit of price. */
	readonly #base: number;
	readonly #minMove: number;
	readonly #fractionalLength: number;

	/**
	 * @param priceScale - 10 to the power of the number of decimal places (100 for 2 places)
	 * @param minMove - the minimum price move, in units of `1 / priceScale`
	 */
	public constructor(priceScale?: number, minMove?: number) {
		if (!minMove) {
			minMove = 1;
		}

		if (!isNumber(priceScale) || !isInteger(priceScale)) {
			priceScale = 100;
		}

		if (priceScale < 0) {
			throw new TypeError('invalid base');
		}

		this.#minMove = minMove;
		this.#base = priceScale / minMove;

		let fractionalLength = 0;
		for (let rest = priceScale; rest > 1; rest /= 10) {
			fractionalLength++;
		}
		this.#fractionalLength = fractionalLength;
	}

	public format(price: number): string {
		// \u2212 is unicode's minus sign https://www.fileformat.info/info/unicode/char/2212/index.htm
		// we should use it because it has the same width as plus sign +
		const sign = price < 0 ? '\u2212' : '';
		price = Math.abs(price);

		const base = this.#base;
		const length = this.#fractionalLength;
		let intPart = Math.floor(price);
		let fracString = '';

		if (base > 1) {
			let fracPart = +(Math.round(price * base) - intPart * base).toFixed(length);
			if (fracPart >= base) {
				fracPart -= base;
				intPart += 1;
			}

			fracString = '.' + String(+fracPart.toFixed(length) * this.#minMove).padStart(length, '0');
		} else {
			// should round int part to min move
			intPart = Math.round(intPart * base) / base;
			// if min move > 1, fractional part is always = 0
			if (length > 0) {
				fracString = '.' + '0'.repeat(length);
			}
		}

		return sign + intPart.toFixed(0) + fracString;
	}
}
