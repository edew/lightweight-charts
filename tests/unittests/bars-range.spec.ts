import { expect } from 'chai';
import { describe, it } from 'vitest';

import type { TimePointIndex } from '../../src/model/time-scale/time-data';
import { BarsRange } from '../../src/model/bars-range';

function barIndex(value: number): TimePointIndex {
	return value as TimePointIndex;
}

describe('BarsRange', () => {
	it('should create a valid bars range', () => {
		const range = new BarsRange(barIndex(0), barIndex(10));
		expect(range.firstBar()).to.equal(0);
		expect(range.lastBar()).to.equal(10);
	});

	it('should create a single bar range', () => {
		const range = new BarsRange(barIndex(5), barIndex(5));
		expect(range.firstBar()).to.equal(5);
		expect(range.lastBar()).to.equal(5);
		expect(range.count()).to.equal(1);
	});

	it('should calculate count correctly', () => {
		const range = new BarsRange(barIndex(3), barIndex(10));
		expect(range.count()).to.equal(8); // 10 - 3 + 1
	});

	it('should check if range contains an index', () => {
		const range = new BarsRange(barIndex(5), barIndex(15));
		expect(range.contains(barIndex(5))).to.be.true;
		expect(range.contains(barIndex(10))).to.be.true;
		expect(range.contains(barIndex(15))).to.be.true;
		expect(range.contains(barIndex(4))).to.be.false;
		expect(range.contains(barIndex(16))).to.be.false;
	});

	it('should check containment at boundaries', () => {
		const range = new BarsRange(barIndex(0), barIndex(100));
		expect(range.contains(barIndex(0))).to.be.true;
		expect(range.contains(barIndex(100))).to.be.true;
		expect(range.contains(barIndex(-1))).to.be.false;
		expect(range.contains(barIndex(101))).to.be.false;
	});

	it('should compare ranges for equality', () => {
		const range1 = new BarsRange(barIndex(5), barIndex(15));
		const range2 = new BarsRange(barIndex(5), barIndex(15));
		const range3 = new BarsRange(barIndex(5), barIndex(14));
		const range4 = new BarsRange(barIndex(6), barIndex(15));

		expect(range1.equals(range2)).to.be.true;
		expect(range1.equals(range3)).to.be.false;
		expect(range1.equals(range4)).to.be.false;
	});

	it('should throw on invalid range (lastBar < firstBar)', () => {
		expect(() => {
			new BarsRange(barIndex(10), barIndex(5));
		}).to.throw();
	});
});
