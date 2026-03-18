import { isInteger, isNumber } from '../helpers/strict-type-checks';

import type { IPriceFormatter } from './iformatter';

export const formatterOptions = {
	decimalSign: '.',
	decimalSignFractional: '\'',
};

// length mustn't be more then 16
export function numberToStringWithLeadingZero(value: number, length: number): string {
	if (!isNumber(value)) {
		return 'n/a';
	}

	if (!isInteger(length)) {
		throw new TypeError('invalid length');
	}

	if (length < 0 || length > 16) {
		throw new TypeError('invalid length');
	}

	if (length === 0) {
		return value.toString();
	}

	const dummyString = '0000000000000000';
	return (dummyString + value.toString()).slice(-length);
}

export class PriceFormatter implements IPriceFormatter {
	protected _fractionalLength: number | undefined;
	readonly #priceScale: number;
	readonly #minMove: number;
	readonly #minMove2: number | undefined;
	readonly #fractional: boolean | undefined;

	public constructor(priceScale?: number, minMove?: number, fractional?: boolean, minMove2?: number) {
		if (!minMove) {
			minMove = 1;
		}

		if (!isNumber(priceScale) || !isInteger(priceScale)) {
			priceScale = 100;
		}

		if (priceScale < 0) {
			throw new TypeError('invalid base');
		}

		this.#priceScale = priceScale;
		this.#minMove = minMove;
		this.#minMove2 = minMove2;
		if (fractional && minMove2 !== undefined && minMove2 > 0 && minMove2 !== 2 && minMove2 !== 4 && minMove2 !== 8) {
			return;
		}

		this.#fractional = fractional;
		this.#calculateDecimal();
	}

	public format(price: number): string {
		// \u2212 is unicode's minus sign https://www.fileformat.info/info/unicode/char/2212/index.htm
		// we should use it because it has the same width as plus sign +
		const sign = price < 0 ? '\u2212' : '';
		price = Math.abs(price);

		if (this.#fractional) {
			return sign + this.#formatAsFractional(price);
		}

		return sign + this.#formatAsDecimal(price);
	}

	#calculateDecimal(): void {
		// check if this._base is power of 10
		// for double fractional _fractionalLength if for the main fractional only
		this._fractionalLength = 0;
		if (this.#priceScale > 0 && this.#minMove > 0) {
			let base = this.#priceScale;
			if (this.#fractional && this.#minMove2) {
				base /= this.#minMove2;
			}

			while (base > 1) {
				base /= 10;
				this._fractionalLength++;
			}
		}
	}

	#formatAsDecimal(price: number): string {
		let base: number;
		if (this.#fractional) {
			// if you really want to format fractional as decimal
			base = Math.pow(10, (this._fractionalLength || 0));
		} else {
			base = this.#priceScale / this.#minMove;
		}

		let intPart = Math.floor(price);

		let fracString = '';
		const fracLength = this._fractionalLength !== undefined ? this._fractionalLength : NaN;
		if (base > 1) {
			let fracPart = +(Math.round(price * base) - intPart * base).toFixed(this._fractionalLength);
			if (fracPart >= base) {
				fracPart -= base;
				intPart += 1;
			}

			fracString = formatterOptions.decimalSign + numberToStringWithLeadingZero(+fracPart.toFixed(this._fractionalLength) * this.#minMove, fracLength);
		} else {
			// should round int part to min move
			intPart = Math.round(intPart * base) / base;
			// if min move > 1, fractional part is always = 0
			if (fracLength > 0) {
				fracString = formatterOptions.decimalSign + numberToStringWithLeadingZero(0, fracLength);
			}
		}

		return intPart.toFixed(0) + fracString;
	}

	#formatAsFractional(price: number): string {
		// temporary solution - use decimal format with 2 digits
		const base = this.#priceScale / this.#minMove;
		let intPart = Math.floor(price);
		let fracPart = Math.round(price * base) - intPart * base;

		if (fracPart === base) {
			fracPart = 0;
			intPart += 1;
		}

		if (!this._fractionalLength) {
			throw new Error('_fractionalLength is not calculated');
		}

		let fracString = '';
		if (this.#minMove2) {
			const minmove2 = ['0', '5'];
			const minmove4 = ['0', '2', '5', '7'];
			const minmove8 = ['0', '1', '2', '3', '4', '5', '6', '7'];

			// format double fractional
			const secondFract = fracPart % this.#minMove2;

			fracPart = (fracPart - secondFract) / this.#minMove2;

			const part1 = numberToStringWithLeadingZero(fracPart, this._fractionalLength);
			const part2 = this.#minMove2 === 2 ?
				minmove2[secondFract] :
				this.#minMove2 === 8 ?
					minmove8[secondFract] :
					minmove4[secondFract];
			fracString = part1 + formatterOptions.decimalSignFractional + part2;
		} else {
			fracString = numberToStringWithLeadingZero(fracPart * this.#minMove, this._fractionalLength);
		}

		return intPart.toString() + formatterOptions.decimalSignFractional + fracString;
	}
}
