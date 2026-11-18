import { expect } from 'chai';
import { describe, it } from 'vitest';

import { priceFormat, volumeFormat } from '../../src/formatters/price-formatter';

describe('priceFormat', () => {
	it('formats with the precision', () => {
		expect(priceFormat(2, 0.01)(123.456)).to.equal('123.46');
		expect(priceFormat(2, 0.01)(0)).to.equal('0.00');
		expect(priceFormat(2, 0.01)(1.5)).to.equal('1.50');
		expect(priceFormat(0, 1)(123.456)).to.equal('123');
		expect(priceFormat(1, 0.1)(123.456)).to.equal('123.5');
		expect(priceFormat(3, 0.001)(123.456)).to.equal('123.456');
	});

	it('uses the Unicode minus sign', () => {
		expect(priceFormat(2, 0.01)(-10.5)).to.equal('−10.50');
	});

	it('rounds to the minimum move', () => {
		expect(priceFormat(3, 0.25)(1.6)).to.equal('1.500');
		expect(priceFormat(2, 0.05)(1.03)).to.equal('1.05');
		expect(priceFormat(0, 5)(13.7)).to.equal('15');
	});

	it('adds the suffix', () => {
		expect(priceFormat(2, 0.01, '%')(50)).to.equal('50.00%');
		expect(priceFormat(2, 0.01, '%')(-25)).to.equal('−25.00%');
		expect(priceFormat(1, 0.1, '%')(12.3)).to.equal('12.3%');
	});
});

describe('volumeFormat', () => {
	it('formats small numbers with no suffix', () => {
		expect(volumeFormat(2)(0)).to.equal('0');
		expect(volumeFormat(2)(123)).to.equal('123');
		expect(volumeFormat(2)(994)).to.equal('994');
		expect(volumeFormat(2)(0.5)).to.equal('0.5');
	});

	it('uses K, M and B', () => {
		expect(volumeFormat(2)(1000)).to.equal('1K');
		expect(volumeFormat(2)(1500)).to.equal('1.5K');
		expect(volumeFormat(2)(994999)).to.equal('995K');
		expect(volumeFormat(2)(1000000)).to.equal('1M');
		expect(volumeFormat(2)(2500000)).to.equal('2.5M');
		expect(volumeFormat(3)(1155000)).to.equal('1.155M');
		expect(volumeFormat(2)(1000000000)).to.equal('1B');
		expect(volumeFormat(2)(5600000000)).to.equal('5.6B');
	});

	it('uses the precision', () => {
		expect(volumeFormat(0)(1500)).to.equal('2K');
		expect(volumeFormat(3)(1500)).to.equal('1.5K');
	});

	it('formats negative numbers', () => {
		expect(volumeFormat(2)(-1000)).to.equal('-1K');
		expect(volumeFormat(2)(-500)).to.equal('-500');
	});
});
