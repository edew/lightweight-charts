import { expect } from 'chai';
import { describe, it } from 'vitest';

import { line } from '../helpers/fixtures';
import { createHeadlessChart } from '../helpers/headless-chart';
import { createNullContext } from '../helpers/null-context';

describe('frame', () => {
	it('applies the requests of the model before it draws', () => {
		const chart = createHeadlessChart({ width: 200, height: 100 });
		chart.addSeries('Line').setData(line(100));
		chart.model.fitContent();
		chart.draw(createNullContext(), 1);

		const bars = chart.model.timeScale().visibleBars();
		expect(bars?.first).to.be.equal(0);
		expect(bars?.last).to.be.equal(99);
	});
});
