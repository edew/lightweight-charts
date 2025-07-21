import type { BarPrice } from './bar';

export type PriceFormatterFn = (priceValue: BarPrice) => string;
