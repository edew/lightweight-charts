import { expect } from 'chai';
import { describe, it } from 'vitest';

import { priceFormat } from '../../src/formatters/price-formatter';
import { clone } from '../../src/helpers/strict-type-checks';
import { chartOptionsDefaults } from '../../src/api/options/chart-options-defaults';
import type { Coordinate } from '../../src/model/coordinate';
import { PriceScale, PriceScaleMode, type PriceScaleOptions } from '../../src/model/price-scale/price-scale';
import type { Series } from '../../src/model/series';
import type { TimePointIndex } from '../../src/model/time-scale/time-data';

const bars = { first: 0 as TimePointIndex, last: 10 as TimePointIndex };

/** A scale of 101 pixels with no margins and one source with the given range of prices. */
function createScale(min: number, max: number, options: Partial<PriceScaleOptions> = {}, minMove: number = 0.01): PriceScale {
	const defaults = clone(chartOptionsDefaults);
	const scaleOptions = { ...defaults.priceScale, scaleMargins: { top: 0, bottom: 0 }, ...options };
	const scale = new PriceScale(scaleOptions, defaults.layout, defaults.localization);
	const source = {
		firstValue: () => ({ value: min, timeIndex: 0 }),
		autoscaleRange: () => ({ min, max }),
		minMove: () => minMove,
		formatter: () => priceFormat(2, minMove),
	};
	scale.setHeight(101);
	scale.addSource(source as unknown as Series);
	scale.recalculatePriceRange(bars);
	return scale;
}

describe('PriceScale', () => {
	it('fits the range to the sources', () => {
		const scale = createScale(10, 20);
		expect(scale.priceRange()).to.deep.equal({ min: 10, max: 20 });
		expect(scale.isEmpty()).to.equal(false);
		expect(scale.priceToCoordinate(20, 10)).to.equal(0);
		expect(scale.priceToCoordinate(10, 10)).to.equal(100);
		expect(scale.priceToCoordinate(15, 10)).to.equal(50);
		expect(scale.coordinateToPrice(25 as Coordinate, 10)).to.equal(17.5);
	});

	it('uses the margins', () => {
		const scale = createScale(10, 20, { scaleMargins: { top: 0.2, bottom: 0.1 } });
		// 101 pixels: 20.2 at the top, 10.1 at the bottom
		expect(scale.priceToCoordinate(20, 10)).to.be.closeTo(20.2, 1e-9);
		expect(scale.priceToCoordinate(10, 10)).to.be.closeTo(89.9, 1e-9);
	});

	it('an inverted scale has the low prices at the top', () => {
		const scale = createScale(10, 20, { invertScale: true });
		expect(scale.priceToCoordinate(10, 10)).to.equal(0);
		expect(scale.priceToCoordinate(20, 10)).to.equal(100);
		expect(scale.coordinateToPrice(25 as Coordinate, 10)).to.equal(12.5);
	});

	it('extends a range of one value', () => {
		const scale = createScale(10, 10, {}, 0.5);
		expect(scale.priceRange()).to.deep.equal({ min: 7.5, max: 12.5 });
	});

	it('is empty with no height or no range', () => {
		const scale = createScale(10, 20);
		scale.setHeight(0);
		expect(scale.isEmpty()).to.equal(true);
		scale.setHeight(101);
		scale.setPriceRange({ min: NaN, max: 1 });
		expect(scale.isEmpty()).to.equal(true);
	});

	it('converts many prices in one pass with the same result', () => {
		for (const mode of [PriceScaleMode.Normal, PriceScaleMode.Logarithmic, PriceScaleMode.Percentage, PriceScaleMode.IndexedTo100]) {
			const scale = createScale(10, 20, { mode, scaleMargins: { top: 0.2, bottom: 0.1 } });
			const values = new Float64Array([10, 12.5, 17, 20]);
			const out = new Float64Array(4);
			scale.pricesToCoordinates(values, 0, 4, out, 10);
			for (let i = 0; i < 4; i++) {
				expect(out[i]).to.be.closeTo(scale.priceToCoordinate(values[i], 10), 1e-9);
				expect(scale.coordinateToPrice(out[i] as Coordinate, 10)).to.be.closeTo(values[i], 1e-6);
			}
		}
	});

	describe('marks', () => {
		it('are at round prices, from the top', () => {
			const marks = createScale(10, 20).marks();
			// a label needs 28 pixels (2.5 times the font size), so the step is 4 and not 2.5
			expect(marks.map((mark) => mark.label)).to.deep.equal(['20.00', '16.00', '12.00']);
			expect(marks.map((mark) => mark.coord)).to.deep.equal([0, 40, 80]);
		});

		it('use the minimum move of the first source', () => {
			const marks = createScale(1, 1.75, {}, 0.25).marks();
			for (const mark of marks) {
				expect(Number(mark.label) % 0.25).to.equal(0);
			}
			expect(marks.length).to.be.greaterThan(0);
		});

		it('show percentages in the percentage mode', () => {
			const scale = createScale(10, 20, { mode: PriceScaleMode.Percentage });
			expect(scale.priceRange()).to.deep.equal({ min: 0, max: 100 });
			expect(scale.marks().map((mark) => mark.label)).to.deep.equal(['80.00%', '40.00%']);
			expect(scale.formatPrice(15, 10)).to.equal('50.00%');
			expect(scale.formatPriceAbsolute(15)).to.equal('15.00');
		});

		it('show values from 100 in the mode "indexed to 100"', () => {
			const scale = createScale(10, 20, { mode: PriceScaleMode.IndexedTo100 });
			expect(scale.priceRange()).to.deep.equal({ min: 100, max: 200 });
			expect(scale.formatPrice(15, 10)).to.equal('150.00');
		});

		it('are prices in the logarithmic mode, with a distance of one label or more', () => {
			const scale = createScale(1, 1000, { mode: PriceScaleMode.Logarithmic });
			scale.setHeight(400);
			const marks = scale.marks();
			expect(marks.length).to.be.greaterThan(2);
			for (let i = 0; i < marks.length; i++) {
				const price = Number(marks[i].label);
				expect(price).to.be.greaterThan(1).and.lessThan(1000);
				expect(scale.priceToCoordinate(price, 1)).to.be.closeTo(marks[i].coord, 1e-6);
				if (i > 0) {
					expect(price).to.be.lessThan(Number(marks[i - 1].label));
					expect(marks[i].coord - marks[i - 1].coord).to.be.greaterThan(27);
				}
			}
		});

		it('are built again after a change of the range', () => {
			const scale = createScale(10, 20);
			scale.marks();
			scale.setAutoScale(false);
			scale.setPriceRange({ min: 100, max: 200 });
			expect(scale.marks().map((mark) => mark.label)).to.deep.equal(['200.00', '160.00', '120.00']);
		});
	});

	describe('change of the mode', () => {
		it('converts the range of a scale with no autoscale', () => {
			const scale = createScale(10, 20, { autoScale: false });
			scale.setPriceRange({ min: 1, max: 100 });
			scale.applyOptions({ mode: PriceScaleMode.Logarithmic });
			expect(scale.coordinateToPrice(0 as Coordinate, 10)).to.be.closeTo(100, 1e-6);
			expect(scale.coordinateToPrice(100 as Coordinate, 10)).to.be.closeTo(1, 1e-6);

			scale.applyOptions({ mode: PriceScaleMode.Normal });
			expect(scale.priceRange()?.min).to.be.closeTo(1, 1e-6);
			expect(scale.priceRange()?.max).to.be.closeTo(100, 1e-6);
		});

		it('a percentage mode sets autoscale and fits the range again', () => {
			const scale = createScale(10, 20, { autoScale: false });
			scale.setPriceRange({ min: 0, max: 1000 });
			scale.applyOptions({ mode: PriceScaleMode.Percentage });
			expect(scale.isAutoScale()).to.equal(true);
			expect(scale.priceRange()).to.deep.equal({ min: 0, max: 100 });
		});

		it('keeps the options when the new margins are not valid', () => {
			const scale = createScale(10, 20);
			expect(() => scale.applyOptions({ scaleMargins: { top: 0.8, bottom: 0.8 } })).to.throw();
			expect(scale.options().scaleMargins).to.deep.equal({ top: 0, bottom: 0 });
		});

		it('does not accept margins that are too large', () => {
			const scale = createScale(10, 20);
			expect(() => scale.applyOptions({ scaleMargins: { top: 0.7, bottom: 0.5 } })).to.throw();
		});
	});

	describe('drag', () => {
		it('a drag on the axis scales around the center and sets autoscale off', () => {
			const scale = createScale(10, 20);
			scale.startScale(50);
			scale.scaleTo(80);
			const range = scale.priceRange();
			expect(scale.isAutoScale()).to.equal(false);
			expect((range!.min + range!.max) / 2).to.be.closeTo(15, 1e-9);
			expect(range!.max - range!.min).to.be.greaterThan(10);

			scale.endDrag();
			scale.scaleTo(10);
			expect(scale.priceRange()).to.deep.equal(range);
		});

		it('a drag in the pane moves the range, only with autoscale off', () => {
			const scale = createScale(10, 20);
			scale.startScroll(50);
			scale.scrollTo(60);
			expect(scale.priceRange()).to.deep.equal({ min: 10, max: 20 });

			scale.setAutoScale(false);
			scale.startScroll(50);
			scale.scrollTo(60);
			expect(scale.priceRange()).to.deep.equal({ min: 11, max: 21 });
		});

		it('a percentage scale cannot be scaled', () => {
			const scale = createScale(10, 20, { mode: PriceScaleMode.Percentage });
			scale.startScale(50);
			scale.scaleTo(80);
			expect(scale.priceRange()).to.deep.equal({ min: 0, max: 100 });
		});
	});
});
