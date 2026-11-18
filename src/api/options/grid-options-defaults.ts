import type { GridOptions } from '../../model/grid';
import { LineStyle } from '../../draw/line-style';

export const gridOptionsDefaults: GridOptions = {
	vertLines: {
		color: '#D6DCDE',
		style: LineStyle.Solid,
		visible: true,
	},
	horzLines: {
		color: '#D6DCDE',
		style: LineStyle.Solid,
		visible: true,
	},
};
