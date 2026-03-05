import { expect } from 'chai';
import { describe, it, beforeEach } from 'vitest';

import { PriceTickMarkBuilder } from '../../src/model/price-scale/price-tick-mark-builder';
import type { PriceScale } from '../../src/model/price-scale/price-scale';

// Mock PriceScale
class MockPriceScale {
	public _height = 500;
	public _firstValue: number | null = 100;
	public _options = { entireTextOnly: false };
	public _isLog = false;
	public _fontSize = 12;

	public height() { return this._height; }
	public firstValue() { return this._firstValue; }
	public options() { return this._options; }
	public isLog() { return this._isLog; }
	public fontSize() { return this._fontSize; }
	public formatLogical(l: number) { return l.toString(); }
}

describe('PriceTickMarkBuilder', () => {
	let priceScale: MockPriceScale;
	let builder: PriceTickMarkBuilder;

	const logicalToCoordinate = (x: number, firstValue: number, keepItFloat: boolean) => {
		return (firstValue - x) * 5;
	};

	const coordinateToLogical = (x: number, firstValue: number) => {
		return firstValue - x / 5;
	};

	beforeEach(() => {
		priceScale = new MockPriceScale();
		builder = new PriceTickMarkBuilder(
			priceScale as unknown as PriceScale,
			10,
			coordinateToLogical,
			logicalToCoordinate
		);
	});

	it('should build tick marks when firstValue is set', () => {
		builder.rebuildTickMarks();
		const marks = builder.marks();
		expect(marks.length).to.be.greaterThan(0);
		expect(marks[0]).to.have.property('coord');
		expect(marks[0]).to.have.property('label');
	});

	it('should return empty marks when firstValue is null', () => {
		priceScale._firstValue = null;
		builder.rebuildTickMarks();

		expect(builder.marks()).to.be.empty;
	});

	it('should return empty marks when high === low', () => {
		const sameMapping = () => 100;
		const builder2 = new PriceTickMarkBuilder(
			priceScale as unknown as PriceScale,
			10,
			sameMapping,
			sameMapping
		);
		builder2.rebuildTickMarks();

		expect(builder2.marks()).to.be.empty;
	});

	it('should re-use marks objects when possible', () => {
		builder.rebuildTickMarks();
		const firstMarks = [...builder.marks()];
		
		// Rebuild again
		builder.rebuildTickMarks();
		const secondMarks = builder.marks();
		
		expect(secondMarks.length).to.equal(firstMarks.length);
		// The builder updates the objects in place if possible
		expect(secondMarks[0]).to.equal(firstMarks[0]);
	});

	it('should respect entireTextOnly option', () => {
		priceScale._options.entireTextOnly = true;
		
		builder.rebuildTickMarks();
		const marks = builder.marks();
		
		// When entireTextOnly is true, it shouldn't have marks too close to top/bottom edges
		const fontHeight = priceScale.fontSize();
		const margin = fontHeight / 2;
		const height = priceScale.height();
		
		for (const mark of marks) {
			expect(mark.coord).to.be.at.least(margin);
			expect(mark.coord).to.be.at.most(height - 1 - margin);
		}
	});
});
