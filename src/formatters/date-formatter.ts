import { type DateFormat, type DateFormatFn, dateFormatFunctions } from './date-format';
import type { IDateTimeFormatter } from './iformatter';

export class DateFormatter implements IDateTimeFormatter {
	readonly #locale: string;
	readonly #dateFormatFunc: DateFormatFn;

	public constructor(dateFormat: DateFormat = 'yyyy-MM-dd', locale: string = 'default') {
		this.#dateFormatFunc = dateFormatFunctions[dateFormat];
		this.#locale = locale;
	}

	public format(date: Date): string {
		return this.#dateFormatFunc(date, this.#locale);
	}
}
