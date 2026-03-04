import { expect } from 'chai';
import { describe, it } from 'vitest';

import { optimalBarWidth, optimalCandlestickWidth } from '../../src/renderers/optimal-bar-width';

describe('optimalBarWidth', () => {
	it('should calculate optimal bar width based on bar spacing and pixel ratio', () => {
		const width = optimalBarWidth(100, 1);
		expect(width).to.equal(30);
	});

	it('should scale with pixel ratio', () => {
		const width1 = optimalBarWidth(100, 1);
		const width2 = optimalBarWidth(100, 2);
		expect(width2).to.equal(width1 * 2);
	});

	it('should handle zero bar spacing', () => {
		const width = optimalBarWidth(0, 1);
		expect(width).to.equal(0);
	});

	it('should handle fractional bar spacing', () => {
		const width = optimalBarWidth(100.5, 1);
		expect(width).to.equal(30);
	});

	it('should handle high pixel ratio', () => {
		const width = optimalBarWidth(100, 3);
		expect(width).to.equal(90);
	});

	it('should always return integer value', () => {
		const width = optimalBarWidth(33, 1);
		expect(width).to.equal(Math.floor(33 * 0.3));
		expect(Number.isInteger(width)).to.be.true;
	});

	it('should return 0 for small bar spacing', () => {
		const width = optimalBarWidth(1, 1);
		expect(width).to.equal(0);
	});
});

describe('optimalCandlestickWidth', () => {
	it('should calculate optimal candlestick width', () => {
		const width = optimalCandlestickWidth(100, 1);
		expect(width).to.be.greaterThan(0);
		expect(Number.isInteger(width)).to.be.true;
	});

	it('should scale with pixel ratio', () => {
		const width1 = optimalCandlestickWidth(100, 1);
		const width2 = optimalCandlestickWidth(100, 2);
		expect(width2).to.be.greaterThanOrEqual(width1);
	});

	it('should never be less than 1', () => {
		const width = optimalCandlestickWidth(1, 1);
		expect(width).to.be.greaterThanOrEqual(1);
	});

	it('should not exceed scaled bar spacing', () => {
		const barSpacing = 100;
		const pixelRatio = 1;
		const width = optimalCandlestickWidth(barSpacing, pixelRatio);
		const scaledBarSpacing = Math.floor(barSpacing * pixelRatio);
		expect(width).to.be.lessThan(scaledBarSpacing);
	});

	it('should use 80% of bar spacing as base', () => {
		const barSpacing = 100;
		const pixelRatio = 1;
		const width = optimalCandlestickWidth(barSpacing, pixelRatio);

		expect(width).to.be.lessThanOrEqual(80);
	});

	it('should handle zero bar spacing', () => {
		const width = optimalCandlestickWidth(0, 1);
		expect(width).to.equal(1);
	});

	it('should handle high pixel ratio', () => {
		const barSpacing = 100;
		const pixelRatio = 2;
		const width = optimalCandlestickWidth(barSpacing, pixelRatio);
		expect(width).to.be.greaterThan(0);
		expect(Number.isInteger(width)).to.be.true;
	});

	it('should handle fractional inputs', () => {
		const width = optimalCandlestickWidth(100.7, 1.5);
		expect(Number.isInteger(width)).to.be.true;
		expect(width).to.be.greaterThanOrEqual(1);
	});
});
