import type { IDateTimeFormatter } from './iformatter';
import { numberToStringWithLeadingZero } from './price-formatter';

export class TimeFormatter implements IDateTimeFormatter {
	#formatStr: string;

	public constructor(format?: string) {
		this.#formatStr = format || '%h:%m:%s';
	}

	public format(date: Date): string {
		return this.#formatStr.replace('%h', numberToStringWithLeadingZero(date.getUTCHours(), 2)).
			replace('%m', numberToStringWithLeadingZero(date.getUTCMinutes(), 2)).
			replace('%s', numberToStringWithLeadingZero(date.getUTCSeconds(), 2));
	}
}
