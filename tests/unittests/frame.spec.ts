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

	it('fits the price range one time for data that comes after the first frame, with autoscale off', () => {
		const chart = createHeadlessChart({ width: 200, height: 100, options: { priceScale: { autoScale: false } } });
		const ctx = createNullContext();
		chart.draw(ctx, 1);

		chart.addSeries('Line').setData(line(100));
		chart.draw(ctx, 1);

		const priceScale = chart.model.panes()[0].priceScale;
		expect(priceScale.isAutoScale()).to.be.equal(false);
		expect(priceScale.isEmpty()).to.be.equal(false);
	});

	it('does not build the price tick marks again in a frame after a tick that keeps the price range', () => {
		let calls = 0;
		const chart = createHeadlessChart({
			width: 400,
			height: 240,
			options: {
				priceScale: { position: 'right' },
				localization: { priceFormatter: (price: number) => { calls++; return price.toFixed(2); } },
			},
		});
		const data = line(100);
		const series = chart.addSeries('Line', { lastValueVisible: false });
		series.setData(data);
		const ctx = createNullContext();
		chart.draw(ctx, 1);

		// a tick that does not change the price range
		const last = data[data.length - 1];
		series.update({ time: last.time, value: last.value });
		calls = 0;
		chart.draw(ctx, 1);

		const marks = chart.model.panes()[0].priceScale.marks().length;
		expect(marks).to.be.greaterThan(2);
		// the frame does not format the text of the tick marks again
		expect(calls).to.be.lessThan(marks);
	});
});
