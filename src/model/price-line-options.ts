import { LineStyle, type LineWidth } from '../renderers/draw-line';

import type { BarPrice } from './bar';

export interface PriceLineOptions {
	price: BarPrice;
	color: string;
	lineWidth: LineWidth;
	lineStyle: LineStyle;
	axisLabelVisible: boolean;
}
