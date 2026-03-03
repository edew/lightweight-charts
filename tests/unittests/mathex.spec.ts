import { expect } from 'chai';
import { describe, it } from 'vitest';

import {
	ceiledEven,
	ceiledOdd,
	clamp,
	equal,
	greaterOrEqual,
	isBaseDecimal,
	log10,
	min,
} from '../../src/helpers/mathex';

describe('mathex', () => {
	it('clamp constrains values into range', () => {
		expect(clamp(5, 1, 10)).to.equal(5);
		expect(clamp(-1, 1, 10)).to.equal(1);
		expect(clamp(100, 1, 10)).to.equal(10);
	});

	it('isBaseDecimal matches current behavior', () => {
		expect(isBaseDecimal(1)).to.equal(true);
		expect(isBaseDecimal(10)).to.equal(true);
		expect(isBaseDecimal(1000)).to.equal(true);
		expect(isBaseDecimal(20)).to.equal(false);
		expect(isBaseDecimal(-10)).to.equal(false);
		expect(isBaseDecimal(0)).to.equal(true);
	});

	it('greaterOrEqual respects epsilon', () => {
		expect(greaterOrEqual(10, 10.05, 0.1)).to.equal(true);
		expect(greaterOrEqual(10, 10.2, 0.1)).to.equal(false);
	});

	it('equal uses strict less-than epsilon', () => {
		expect(equal(1, 1.05, 0.1)).to.equal(true);
		expect(equal(1, 1.1, 0.1)).to.equal(false);
	});

	it('log10 handles positive and non-positive values', () => {
		expect(log10(1)).to.equal(0);
		expect(log10(100)).to.equal(2);
		expect(Number.isNaN(log10(0))).to.equal(true);
		expect(Number.isNaN(log10(-5))).to.equal(true);
	});

	it('min returns smallest item and throws for empty arrays', () => {
		expect(min([4, -1, 6, 0])).to.equal(-1);
		expect(() => min([])).to.throw('array is empty');
	});

	it('ceiledEven and ceiledOdd follow implementation parity rule', () => {
		expect(ceiledEven(1.2)).to.equal(2);
		expect(ceiledEven(2.0)).to.equal(2);
		expect(ceiledEven(3.0)).to.equal(2);

		expect(ceiledOdd(1.2)).to.equal(1);
		expect(ceiledOdd(2.0)).to.equal(1);
		expect(ceiledOdd(3.0)).to.equal(3);
	});
});
