import { expect } from 'chai';
import { describe, it } from 'vitest';

import { chartOptionsDefaults } from '../../src/api/options/chart-options-defaults';
import { seriesOptionsFromSpec } from '../../src/api/series-api';
import { clone } from '../../src/helpers/strict-type-checks';
import { ChartModel } from '../../src/model/chart-model';
import { Series } from '../../src/model/series';
import { Line } from '../../src/series/line';

describe('Series', () => {
	it('has its pane and its price scale directly after construction', () => {
		const model = new ChartModel(() => {}, clone(chartOptionsDefaults));
		const spec = Line({});
		const pane = model.panes()[0];
		const series = new Series(model, pane, pane.priceScale, spec.kind, seriesOptionsFromSpec(spec));
		expect(series.pane()).to.equal(pane);
		expect(series.priceScale()).to.equal(pane.priceScale);
	});
});
