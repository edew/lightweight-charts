export interface IPriceFormatter {
	format(price: number): string;
}

export interface IDateTimeFormatter {
	format(date: Date): string;
}
