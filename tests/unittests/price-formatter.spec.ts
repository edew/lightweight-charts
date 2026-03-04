import { expect } from 'chai';
import { describe, it } from 'vitest';

import { numberToStringWithLeadingZero, PriceFormatter } from '../../src/formatters/price-formatter';

describe('PriceFormatter', () => {
	describe('numberToStringWithLeadingZero', () => {
		it('should add leading zeros correctly', () => {
			expect(numberToStringWithLeadingZero(5, 2)).to.equal('05');
			expect(numberToStringWithLeadingZero(123, 5)).to.equal('00123');
		});

		it('should not add zeros if length is met', () => {
			expect(numberToStringWithLeadingZero(123, 3)).to.equal('123');
			expect(numberToStringWithLeadingZero(1234, 2)).to.equal('34'); // Truncates? slice(-length)
		});

		it('should return n/a for non-numbers', () => {
			expect(numberToStringWithLeadingZero(NaN, 2)).to.equal('n/a');
		});

		it('should throw for invalid lengths', () => {
			expect(() => numberToStringWithLeadingZero(5, -1)).to.throw(TypeError);
			expect(() => numberToStringWithLeadingZero(5, 17)).to.throw(TypeError);
			expect(() => numberToStringWithLeadingZero(5, 1.5)).to.throw(TypeError);
		});
	});

	describe('format', () => {
		it('should format prices as decimal by default', () => {
			const formatter = new PriceFormatter(100, 1);
			expect(formatter.format(123.456)).to.equal('123.46');
			expect(formatter.format(0)).to.equal('0.00');
		});

		it('should use unicode minus sign for negative prices', () => {
			const formatter = new PriceFormatter(100, 1);
			expect(formatter.format(-10.5)).to.contain('\u2212');
			expect(formatter.format(-10.5)).to.equal('\u221210.50');
		});

		it('should respect priceScale for decimal places', () => {
			const f1 = new PriceFormatter(1, 1);
			expect(f1.format(123.456)).to.equal('123');

			const f10 = new PriceFormatter(10, 1);
			expect(f10.format(123.456)).to.equal('123.5');

			const f1000 = new PriceFormatter(1000, 1);
			expect(f1000.format(123.456)).to.equal('123.456');
		});
	});
});
