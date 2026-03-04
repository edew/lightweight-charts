import { expect } from 'chai';
import { describe, it } from 'vitest';

import { PriceTickSpanCalculator } from '../../src/model/price-scale/price-tick-span-calculator';

describe('PriceTickSpanCalculator', () => {
	it('should calculate tick span for range 0-100 with dividers [1,2,5]', () => {
		const calc = new PriceTickSpanCalculator(10, [1, 2, 5]);
		const tickSpan = calc.tickSpan(100, 0, 10);

		expect(tickSpan).to.be.greaterThan(0);
	});

	it('should calculate tick span for small range', () => {
		const calc = new PriceTickSpanCalculator(10, [1, 2, 5]);
		const tickSpan = calc.tickSpan(0.1, 0, 0.01);

		expect(tickSpan).to.be.greaterThan(0);
	});

	it('should calculate tick span for large range', () => {
		const calc = new PriceTickSpanCalculator(10, [1, 2, 5]);
		const tickSpan = calc.tickSpan(1000000, 0, 100);

		expect(tickSpan).to.be.greaterThan(0);
	});

	it('should handle identical high and low values (zero range)', () => {
		const calc = new PriceTickSpanCalculator(10, [1, 2, 5]);
		const tickSpan = calc.tickSpan(100, 100, 10);

		expect(Number.isNaN(tickSpan)).to.be.true;
	});

	it('should calculate consistent tick span for same inputs', () => {
		const calc = new PriceTickSpanCalculator(10, [1, 2, 5]);
		const tickSpan1 = calc.tickSpan(50, 0, 5);
		const tickSpan2 = calc.tickSpan(50, 0, 5);

		expect(tickSpan1).to.equal(tickSpan2);
	});

	it('should throw on unsupported base with non-2-5 factors', () => {
		expect(() => {
			new PriceTickSpanCalculator(7, [1, 2]);
		}).to.throw();
	});

	it('should calculate tick span with base 2', () => {
		const calc = new PriceTickSpanCalculator(2, [1, 2]);
		const tickSpan = calc.tickSpan(100, 0, 10);
		expect(tickSpan).to.be.a('number');
		expect(tickSpan).to.be.greaterThan(0);
	});

	it('should return tick span based on range and maxTickSpan', () => {
		const calc = new PriceTickSpanCalculator(10, [1, 2, 5]);
		const tickSpan = calc.tickSpan(1, 0.5, 0.001);
		// Tick span can be any positive number, not necessarily >= 1
		expect(tickSpan).to.be.a('number');
		expect(tickSpan).to.be.greaterThan(0);
	});

	it('should handle very small maxTickSpan', () => {
		const calc = new PriceTickSpanCalculator(10, [1, 2, 5]);
		const tickSpan = calc.tickSpan(100, 0, 0.001);
		expect(tickSpan).to.be.a('number');
		expect(tickSpan).to.be.greaterThan(0);
	});
});
