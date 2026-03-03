import { expect } from 'chai';
import { describe, it } from 'vitest';

import { PriceRange } from '../../src/model/price-range';
import {
	canConvertPriceRangeFromLog,
	convertPriceRangeFromLog,
	convertPriceRangeToLog,
	fromIndexedTo100,
	fromLog,
	fromPercent,
	toIndexedTo100,
	toIndexedTo100Range,
	toLog,
	toPercent,
	toPercentRange,
} from '../../src/model/price-scale/price-scale-conversions';

describe('price-scale-conversions', () => {
	it('fromPercent and toPercent are inverse-like for positive base', () => {
		const base = 200;
		const price = fromPercent(10, base);
		expect(price).to.equal(220);
		expect(toPercent(price, base)).to.be.closeTo(10, 1e-7);
	});

	it('fromPercent and toPercent handle negative base sign convention', () => {
		const base = -200;
		const price = fromPercent(10, base);
		expect(price).to.equal(-180);
		expect(toPercent(price, base)).to.be.closeTo(10, 1e-7);
	});

	it('toPercentRange maps both bounds', () => {
		const range = new PriceRange(180, 220);
		const converted = toPercentRange(range, 200);
		expect(converted.minValue()).to.be.closeTo(-10, 1e-7);
		expect(converted.maxValue()).to.be.closeTo(10, 1e-7);
	});

	it('indexed-to-100 conversion maps base to 100 and back', () => {
		const base = 50;
		expect(toIndexedTo100(base, base)).to.be.closeTo(100, 1e-7);
		expect(fromIndexedTo100(100, base)).to.be.closeTo(base, 1e-7);
		expect(fromIndexedTo100(toIndexedTo100(75, base), base)).to.be.closeTo(75, 1e-7);
	});

	it('indexed-to-100 handles negative base using current formulas', () => {
		const base = -50;
		expect(toIndexedTo100(base, base)).to.be.closeTo(-100, 1e-7);
		expect(toIndexedTo100(-75, base)).to.be.closeTo(-150, 1e-7);
		expect(fromIndexedTo100(100, base)).to.be.closeTo(base, 1e-7);
		expect(fromIndexedTo100(0, base)).to.be.closeTo(-100, 1e-7);
	});

	it('toIndexedTo100Range maps both bounds', () => {
		const range = new PriceRange(25, 75);
		const converted = toIndexedTo100Range(range, 50);
		expect(converted.minValue()).to.be.closeTo(50, 1e-7);
		expect(converted.maxValue()).to.be.closeTo(150, 1e-7);
	});

	it('toLog and fromLog map near-zero values to zero', () => {
		expect(toLog(0)).to.equal(0);
		expect(fromLog(0)).to.equal(0);
		expect(toLog(1e-12)).to.equal(0);
		expect(fromLog(1e-12)).to.equal(0);
	});

	it('toLog and fromLog are inverse-like for representative values', () => {
		const values = [0.2, 1, 10, -0.5, -15];
		for (const value of values) {
			const roundTrip = fromLog(toLog(value));
			expect(roundTrip).to.be.closeTo(value, 1e-6);
		}
	});

	it('convertPriceRangeToLog and convertPriceRangeFromLog handle null', () => {
		expect(convertPriceRangeToLog(null)).to.equal(null);
		expect(convertPriceRangeFromLog(null)).to.equal(null);
	});

	it('convertPriceRangeToLog and convertPriceRangeFromLog round-trip ranges', () => {
		const original = new PriceRange(1, 100);
		const asLog = convertPriceRangeToLog(original);
		expect(asLog).to.not.equal(null);
		const back = convertPriceRangeFromLog(asLog);
		expect(back).to.not.equal(null);
		expect(back!.minValue()).to.be.closeTo(original.minValue(), 1e-6);
		expect(back!.maxValue()).to.be.closeTo(original.maxValue(), 1e-6);
	});

	it('canConvertPriceRangeFromLog validates finite output', () => {
		expect(canConvertPriceRangeFromLog(null)).to.equal(false);
		expect(canConvertPriceRangeFromLog(new PriceRange(1, 5))).to.equal(true);
		expect(canConvertPriceRangeFromLog(new PriceRange(1000, 1001))).to.equal(false);
	});
});
