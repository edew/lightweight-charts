import { expect } from 'chai';
import { describe, it } from 'vitest';

import { PriceRange } from '../../src/model/price-range';

describe('PriceRange', () => {
	it('exposes min/max/length correctly', () => {
		const range = new PriceRange(10, 25);
		expect(range.minValue()).to.equal(10);
		expect(range.maxValue()).to.equal(25);
		expect(range.length()).to.equal(15);
	});

	it('equals and clone work as value semantics', () => {
		const range = new PriceRange(1, 2);
		const clone = range.clone();
		expect(range.equals(clone)).to.equal(true);
		expect(range).to.not.equal(clone);
		expect(range.equals(null)).to.equal(false);
	});

	it('isEmpty returns true for zero-length ranges', () => {
		const range = new PriceRange(5, 5);
		expect(range.isEmpty()).to.equal(true);
	});

	it('isEmpty returns true when one side is NaN', () => {
		const range1 = new PriceRange(Number.NaN, 5);
		const range2 = new PriceRange(5, Number.NaN);
		expect(range1.isEmpty()).to.equal(true);
		expect(range2.isEmpty()).to.equal(true);
	});

	it('merge with null keeps same instance', () => {
		const range = new PriceRange(1, 3);
		const merged = range.merge(null);
		expect(merged).to.equal(range);
	});

	it('merge returns new range spanning both intervals', () => {
		const left = new PriceRange(2, 10);
		const right = new PriceRange(-3, 6);
		const merged = left.merge(right);
		expect(merged.minValue()).to.equal(-3);
		expect(merged.maxValue()).to.equal(10);
		expect(merged).to.not.equal(left);
	});

	it('scaleAroundCenter scales both sides around midpoint', () => {
		const range = new PriceRange(10, 20);
		range.scaleAroundCenter(2);
		expect(range.minValue()).to.equal(5);
		expect(range.maxValue()).to.equal(25);
	});

	it('scaleAroundCenter ignores non-number coeff and zero-length range', () => {
		const range1 = new PriceRange(3, 9);
		range1.scaleAroundCenter(Number.NaN);
		expect(range1.minValue()).to.equal(3);
		expect(range1.maxValue()).to.equal(9);

		const range2 = new PriceRange(7, 7);
		range2.scaleAroundCenter(2);
		expect(range2.minValue()).to.equal(7);
		expect(range2.maxValue()).to.equal(7);
	});

	it('shift moves both bounds and ignores non-number deltas', () => {
		const range = new PriceRange(1, 4);
		range.shift(3);
		expect(range.minValue()).to.equal(4);
		expect(range.maxValue()).to.equal(7);

		range.shift(Number.NaN);
		expect(range.minValue()).to.equal(4);
		expect(range.maxValue()).to.equal(7);
	});
});
