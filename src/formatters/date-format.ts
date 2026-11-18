// Formats a date and a time in UTC with a pattern, for the label of the crosshair.

export type DateFormat =
	| '\'yy MMM dd'
	| '\'yy MMMM dd'
	| 'yyyy MMM dd'
	| 'yyyy MMMM dd'
	| 'dd MMM \'yy'
	| 'dd MMMM \'yy'
	| 'dd MMM yyyy'
	| 'dd MMMM yyyy'
	| 'MMM dd, \'yy'
	| 'MMMM dd, \'yy'
	| 'MMM dd, yyyy'
	| 'MMMM dd, yyyy'
	| 'yyyy-MM-dd'
	| 'yy-MM-dd'
	| 'yy/MM/dd'
	| 'yyyy/MM/dd'
	| 'yy.MM.dd'
	| 'yyyy.MM.dd'
	| 'dd-MM-yyyy'
	| 'dd-MM-yy'
	| 'dd/MM/yy'
	| 'dd/MM/yyyy'
	| 'dd.MM.yy'
	| 'dd.MM.yyyy'
	| 'MM-dd-yy'
	| 'MM-dd-yyyy'
	| 'MM/dd/yy'
	| 'MM/dd/yyyy'
	| 'MM.dd.yy'
	| 'MM.dd.yyyy'
;

interface MonthNames {
	short: string[];
	long: string[];
}

// month names for each locale: `toLocaleString` is slow, and there are only 12 months
const monthNames = new Map<string, MonthNames>();

function monthNamesFor(locale: string): MonthNames {
	let names = monthNames.get(locale);
	if (names === undefined) {
		names = { short: [], long: [] };
		for (let month = 0; month < 12; month++) {
			const date = new Date(2000, month, 1);
			names.short.push(date.toLocaleString(locale, { month: 'short' }));
			names.long.push(date.toLocaleString(locale, { month: 'long' }));
		}
		monthNames.set(locale, names);
	}
	return names;
}

function pad(value: number, length: number): string {
	return String(value).padStart(length, '0');
}

const tokens = /yyyy|yy|MMMM|MMM|MM|dd/g;

/** Formats the UTC date of `date`. Characters of the pattern that are not a token stay as they are. */
export function formatDate(date: Date, format: DateFormat, locale: string): string {
	return format.replace(tokens, (token: string) => {
		switch (token) {
			case 'yyyy': return pad(date.getUTCFullYear(), 4);
			case 'yy': return pad(date.getUTCFullYear() % 100, 2);
			case 'MMMM': return monthNamesFor(locale).long[date.getUTCMonth()];
			case 'MMM': return monthNamesFor(locale).short[date.getUTCMonth()];
			case 'MM': return pad(date.getUTCMonth() + 1, 2);
			default: return pad(date.getUTCDate(), 2);
		}
	});
}

/** Formats the UTC time of `date` as hh:mm or hh:mm:ss. */
export function formatTime(date: Date, withSeconds: boolean): string {
	const result = pad(date.getUTCHours(), 2) + ':' + pad(date.getUTCMinutes(), 2);
	return withSeconds ? result + ':' + pad(date.getUTCSeconds(), 2) : result;
}
