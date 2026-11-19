/** Makes the text of a price. */
export type PriceFormatter = (price: number) => string;

/**
 * Formats a price with `precision` decimal places, rounded to a multiple of `minMove`.
 * The minus sign is U+2212: it has the same width as a plus sign.
 */
export function priceFormat(precision: number, minMove: number, suffix: string = ''): PriceFormatter {
	const base = 1 / minMove;
	return (price: number) => {
		const text = (Math.round(Math.abs(price) * base) / base).toFixed(precision);
		// no sign for a negative price that is shown as zero
		return (price < 0 && +text !== 0 ? '\u2212' : '') + text + suffix;
	};
}

function volumeNumber(value: number, precision: number): string {
	// the conversion to a number removes the zeros at the end
	return String(+value.toFixed(precision));
}

/** Formats a volume with the suffixes K, M and B. A number that rounds to 1000 gets the next suffix. */
export function volumeFormat(precision: number): PriceFormatter {
	return (volume: number) => {
		const sign = volume < 0 ? '-' : '';
		volume = Math.abs(volume);
		if (volume < 995) {
			return sign + volumeNumber(volume, precision);
		}

		let text = volumeNumber(volume / 1e3, precision);
		if (volume < 999995 && text !== '1000') {
			return sign + text + 'K';
		}

		text = volumeNumber(Math.round(volume / 1e3) / 1e3, precision);
		if (volume < 999999995 && text !== '1000') {
			return sign + text + 'M';
		}
		return sign + volumeNumber(Math.round(volume / 1e6) / 1e3, precision) + 'B';
	};
}
