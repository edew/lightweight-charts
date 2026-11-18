import type { IPriceFormatter } from '../../formatters/iformatter';

import type { AutoscaleInfo } from './autoscale-info';
import { ChartModel } from '../chart-model';
import type { IDataSource } from './idata-source';
import type { TimePointIndex } from '../time-scale/time-data';

export interface FirstValue {
	value: number;
	timeIndex: number;
}

export interface IPriceDataSource extends IDataSource {
	firstValue(): FirstValue | null;
	formatter(): IPriceFormatter;
	priceLineColor(lastBarColor: string): string;
	model(): ChartModel;
	minMove(): number;
	autoscaleInfo(startTimePoint: TimePointIndex, endTimePoint: TimePointIndex): AutoscaleInfo | null;
}
