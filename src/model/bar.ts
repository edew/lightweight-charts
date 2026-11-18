import type { Nominal } from '../helpers/nominal';

export type BarPrice = Nominal<number, 'BarPrice'>;

export interface BarPrices {
	open: BarPrice;
	high: BarPrice;
	low: BarPrice;
	close: BarPrice;
}
