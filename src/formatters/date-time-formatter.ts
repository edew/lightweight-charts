import type { DateFormat } from './date-format';
import { DateFormatter } from './date-formatter';
import type { IDateTimeFormatter } from './iformatter';
import { TimeFormatter } from './time-formatter';

export interface DateTimeFormatterParams {
	dateFormat: DateFormat;
	timeFormat: string;
	dateTimeSeparator: string;
	locale: string;
}

const defaultParams: DateTimeFormatterParams = {
	dateFormat: 'yyyy-MM-dd',
	timeFormat: '%h:%m:%s',
	dateTimeSeparator: ' ',
	locale: 'default',
};

export class DateTimeFormatter implements IDateTimeFormatter {
	readonly #dateFormatter: DateFormatter;
	readonly #timeFormatter: TimeFormatter;
	readonly #separator: string;

	public constructor(params: Partial<DateTimeFormatterParams> = {}) {
		const formatterParams = { ...defaultParams, ...params };
		this.#dateFormatter = new DateFormatter(formatterParams.dateFormat, formatterParams.locale);
		this.#timeFormatter = new TimeFormatter(formatterParams.timeFormat);
		this.#separator = formatterParams.dateTimeSeparator;
	}

	public format(dateTime: Date): string {
		return `${this.#dateFormatter.format(dateTime)}${this.#separator}${this.#timeFormatter.format(dateTime)}`;
	}
}
