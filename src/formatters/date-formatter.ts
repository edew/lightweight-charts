import { type DateFormat, type DateFormatFn, dateFormatFunctions } from './date-format';
import type { IFormatter } from './iformatter';

export class DateFormatter implements IFormatter {
	private readonly _locale: string;
	private readonly _dateFormatFunc: DateFormatFn;

	public constructor(dateFormat: DateFormat = 'yyyy-MM-dd', locale: string = 'default') {
		this._dateFormatFunc = dateFormatFunctions[dateFormat];
		this._locale = locale;
	}

	public format(date: Date): string {
		return this._dateFormatFunc(date, this._locale);
	}
}
