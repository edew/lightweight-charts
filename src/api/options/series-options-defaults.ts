import { LineStyle } from '../../draw/line-style';

import type { SeriesOptionsCommon } from '../../model/series-options';

export const seriesOptionsDefaults: SeriesOptionsCommon = {
	pane: 0,
	title: '',
	lastValueVisible: true,
	baseLineVisible: true,
	baseLineWidth: 1,
	baseLineColor: '#B2B5BE',
	baseLineStyle: LineStyle.Solid,
	priceFormat: {
		type: 'price',
		precision: 2,
		minMove: 0.01,
	},
};
