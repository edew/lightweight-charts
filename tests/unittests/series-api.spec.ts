import { expect } from 'chai';
import { describe, it } from 'vitest';

import { chartOptionsDefaults } from '../../src/api/options/chart-options-defaults';
import { SeriesApi, seriesOptionsFromSpec } from '../../src/api/series-api';
import { clone } from '../../src/helpers/strict-type-checks';
import { ChartModel } from '../../src/model/chart-model';
import type { UTCTimestamp } from '../../src/model/time-scale/time-data';
import { Line } from '../../src/series/line';

function createModel(): ChartModel {
	const model = new ChartModel(() => {}, clone(chartOptionsDefaults));
	model.setSize(200, [100]);
	return model;
}

function addLine(model: ChartModel): SeriesApi<'Line'> {
	const spec = Line({});
	const options = seriesOptionsFromSpec(spec);
	return new SeriesApi(model.createSeries(spec.kind, options, options.pane), spec);
}

const data = [
	{ time: 1000 as UTCTimestamp, value: 1 },
	{ time: 2000 as UTCTimestamp, value: 2 },
	{ time: 3000 as UTCTimestamp, value: 3 },
];

describe('SeriesApi', () => {
	it('a removed series cannot change the chart', () => {
		const model = createModel();
		const first = addLine(model);
		const second = addLine(model);
		first.setData(data);
		second.setData(data);

		// what ChartApi.removeSeries() does
		second.destroy();

		expect(() => second.update({ time: 4000 as UTCTimestamp, value: 4 })).to.throw();
		expect(() => second.setData(data)).to.throw();
		expect(() => second.applyOptions({ color: 'red' })).to.throw();
		expect(model.dataStore().length).to.equal(3);
	});
});
