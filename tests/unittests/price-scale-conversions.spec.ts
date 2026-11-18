import { expect } from 'chai';
import { describe, it } from 'vitest';

import { fractionalDividers, fromLog, fromRelative, tickSpan, toLog, toRelative } from '../../src/model/price-scale/price-scale';

describe('price scale conversions', () => {
	it('percentage of the difference from the base', () => {
		expect(toRelative(220, 200, 0)).to.be.closeTo(10, 1e-7);
		expect(fromRelative(10, 200, 0)).to.equal(220);
		expect(toRelative(180, 200, 0)).to.be.closeTo(-10, 1e-7);
	});

	it('percentage with a negative base', () => {
		expect(fromRelative(10, -200, 0)).to.equal(-180);
		expect(toRelative(-180, -200, 0)).to.be.closeTo(10, 1e-7);
	});

	it('indexed to 100', () => {
		expect(toRelative(75, 50, 100)).to.be.closeTo(150, 1e-7);
		expect(toRelative(25, 50, 100)).to.be.closeTo(50, 1e-7);
		expect(fromRelative(150, 50, 100)).to.be.closeTo(75, 1e-7);
		expect(fromRelative(toRelative(-30, -50, 100), -50, 100)).to.be.closeTo(-30, 1e-7);
	});

	it('logarithm keeps the sign and zero', () => {
		expect(toLog(0)).to.equal(0);
		expect(fromLog(0)).to.equal(0);
		expect(toLog(-10)).to.equal(-toLog(10));
		for (const price of [0.001, 1, 100, 12345.678, -42]) {
			expect(fromLog(toLog(price))).to.be.closeTo(price, 1e-6);
		}
	});
});

describe('price tick span', () => {
	const decimal = fractionalDividers(100);

	it('dividers of a decimal base', () => {
		expect(fractionalDividers(1)).to.deep.equal([2, 2.5, 2]);
		expect(fractionalDividers(10)).to.deep.equal([2, 2.5, 2]);
		expect(fractionalDividers(1000)).to.deep.equal([2, 2.5, 2]);
	});

	it('dividers of a base that is not decimal', () => {
		expect(fractionalDividers(4)).to.deep.equal([2, 2]);
		expect(fractionalDividers(20)).to.deep.equal([2, 2, 2, 2.5]);
		expect(fractionalDividers(32)).to.deep.equal([2, 2, 2, 2, 2]);
	});

	it('gives round steps', () => {
		expect(tickSpan(100, 0, 10, 100, [2, 2.5, 2], decimal)).to.equal(10);
		expect(tickSpan(100, 0, 3, 100, [2, 2.5, 2], decimal)).to.equal(5);
		expect(tickSpan(100, 0, 3, 100, [2.5, 2, 2], decimal)).to.equal(4);
		expect(tickSpan(1000000, 0, 100, 100, [2, 2.5, 2], decimal)).to.equal(100);
	});

	it('goes below 1 with the fractional dividers', () => {
		expect(tickSpan(1, 0, 0.1, 100, [2, 2.5, 2], decimal)).to.be.closeTo(0.1, 1e-12);
		expect(tickSpan(1, 0, 0.3, 4, [2, 2.5, 2], fractionalDividers(4))).to.equal(0.5);
	});

	it('is not smaller than the minimum move', () => {
		expect(tickSpan(0.1, 0, 0.0001, 100, [2, 2.5, 2], decimal)).to.be.closeTo(0.01, 1e-12);
		expect(tickSpan(1, 0, 0.001, 4, [2, 2.5, 2], fractionalDividers(4))).to.equal(0.25);
	});
});
