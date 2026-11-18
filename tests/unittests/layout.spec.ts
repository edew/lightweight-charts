import { expect } from 'chai';
import { describe, it } from 'vitest';

import { computeLayout, type HitResult, hitTest, Region } from '../../src/draw/layout';

function hit(layout: ReturnType<typeof computeLayout>, x: number, y: number, margin: number = 0): HitResult {
	return hitTest(layout, x, y, margin, { region: Region.None, index: -1, x: 0, y: 0 });
}

describe('computeLayout', () => {
	it('gives the full chart to one pane when there are no axes', () => {
		const layout = computeLayout(400, 300, [1], 'none', 50, 0);
		expect(layout.panes).to.deep.equal([{ left: 0, top: 0, width: 400, height: 300 }]);
		expect(layout.priceAxes).to.deep.equal([]);
		expect(layout.separators).to.deep.equal([]);
		expect(layout.timeAxis).to.equal(null);
		expect(layout.corner).to.equal(null);
	});

	it('puts the price axis on the right and the time axis at the bottom', () => {
		const layout = computeLayout(400, 300, [1], 'right', 60, 25);
		expect(layout.panes[0]).to.deep.equal({ left: 0, top: 0, width: 340, height: 275 });
		expect(layout.priceAxes[0]).to.deep.equal({ left: 340, top: 0, width: 60, height: 275 });
		expect(layout.timeAxis).to.deep.equal({ left: 0, top: 275, width: 340, height: 25 });
		expect(layout.corner).to.deep.equal({ left: 340, top: 275, width: 60, height: 25 });
	});

	it('puts the price axis on the left', () => {
		const layout = computeLayout(400, 300, [1], 'left', 60, 25);
		expect(layout.panes[0].left).to.equal(60);
		expect(layout.priceAxes[0].left).to.equal(0);
		expect(layout.timeAxis?.left).to.equal(60);
		expect(layout.corner?.left).to.equal(0);
	});

	it('divides the height by the stretch factors, with one pixel for each separator', () => {
		const layout = computeLayout(400, 327, [3, 1], 'right', 60, 26);
		// 327 - 26 (time axis) - 1 (separator) = 300
		expect(layout.panes[0].height).to.equal(225);
		expect(layout.panes[1].height).to.equal(75);
		expect(layout.separators).to.deep.equal([{ left: 0, top: 225, width: 400, height: 1 }]);
		expect(layout.panes[1].top).to.equal(226);
		expect(layout.timeAxis?.top).to.equal(301);
	});

	it('uses all pixels: the regions fill the chart height', () => {
		for (const height of [200, 301, 333, 478]) {
			const layout = computeLayout(400, height, [2, 1, 1], 'right', 60, 26);
			let total = 26 + layout.separators.length;
			for (const pane of layout.panes) {
				total += pane.height;
			}
			expect(total).to.equal(height);
			const last = layout.panes[2];
			expect(last.top + last.height).to.equal(layout.timeAxis?.top);
		}
	});

	it('gives each pane a price axis with the same height', () => {
		const layout = computeLayout(400, 300, [1, 1], 'right', 60, 0);
		expect(layout.priceAxes.length).to.equal(2);
		expect(layout.priceAxes[1].top).to.equal(layout.panes[1].top);
		expect(layout.priceAxes[1].height).to.equal(layout.panes[1].height);
	});
});

describe('hitTest', () => {
	const layout = computeLayout(400, 327, [3, 1], 'right', 60, 26);

	it('finds panes and gives the position in the pane', () => {
		expect(hit(layout, 10, 20)).to.deep.equal({ region: Region.Pane, index: 0, x: 10, y: 20 });
		expect(hit(layout, 10, 236)).to.deep.equal({ region: Region.Pane, index: 1, x: 10, y: 10 });
	});

	it('finds the price axis of each pane', () => {
		expect(hit(layout, 350, 20)).to.deep.equal({ region: Region.PriceAxis, index: 0, x: 10, y: 20 });
		expect(hit(layout, 350, 236).index).to.equal(1);
	});

	it('finds the time axis', () => {
		expect(hit(layout, 100, 310)).to.deep.equal({ region: Region.TimeAxis, index: 0, x: 100, y: 9 });
	});

	it('finds a separator with a grab margin, before the panes', () => {
		expect(hit(layout, 100, 225).region).to.equal(Region.Separator);
		expect(hit(layout, 100, 222).region).to.equal(Region.Pane);
		expect(hit(layout, 100, 222, 4).region).to.equal(Region.Separator);
		expect(hit(layout, 100, 229, 4).region).to.equal(Region.Separator);
		expect(hit(layout, 100, 231, 4).region).to.equal(Region.Pane);
	});

	it('finds nothing in the corner and outside the chart', () => {
		expect(hit(layout, 350, 310).region).to.equal(Region.None);
		expect(hit(layout, -5, 10).region).to.equal(Region.None);
	});
});
