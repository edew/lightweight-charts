import { expect } from 'chai';
import { describe, it } from 'vitest';

import { lowerbound, upperbound } from '../../src/helpers/algorithms';

describe('algorithms lowerbound/upperbound', () => {
	const ascending = [1, 3, 3, 5, 8, 13];
	const lowerCmp = (a: number, b: number) => a < b;
	const upperCmp = (a: number, b: number) => a < b;

	it('lowerbound finds first position where value can be inserted', () => {
		expect(lowerbound(ascending, 0, lowerCmp)).to.equal(0);
		expect(lowerbound(ascending, 3, lowerCmp)).to.equal(1);
		expect(lowerbound(ascending, 4, lowerCmp)).to.equal(3);
		expect(lowerbound(ascending, 99, lowerCmp)).to.equal(ascending.length);
	});

	it('upperbound finds first element greater than value', () => {
		expect(upperbound(ascending, 0, upperCmp)).to.equal(0);
		expect(upperbound(ascending, 3, upperCmp)).to.equal(3);
		expect(upperbound(ascending, 4, upperCmp)).to.equal(3);
		expect(upperbound(ascending, 99, upperCmp)).to.equal(ascending.length);
	});

	it('lowerbound and upperbound respect start/to window', () => {
		const start = 2;
		const to = 5;
		expect(lowerbound(ascending, 2, lowerCmp, start, to)).to.equal(2);
		expect(lowerbound(ascending, 8, lowerCmp, start, to)).to.equal(4);
		expect(upperbound(ascending, 3, upperCmp, start, to)).to.equal(3);
		expect(upperbound(ascending, 8, upperCmp, start, to)).to.equal(5);
	});

	it('returns start for empty search range', () => {
		expect(lowerbound(ascending, 3, lowerCmp, 4, 4)).to.equal(4);
		expect(upperbound(ascending, 3, upperCmp, 4, 4)).to.equal(4);
	});

	it('works with object arrays via custom comparators', () => {
		const points = [{ x: 1 }, { x: 4 }, { x: 4 }, { x: 10 }];
		const objectLowerCmp = (a: { x: number }, b: number) => a.x < b;
		const objectUpperCmp = (a: number, b: { x: number }) => a < b.x;

		expect(lowerbound(points, 4, objectLowerCmp)).to.equal(1);
		expect(upperbound(points, 4, objectUpperCmp)).to.equal(3);
		expect(lowerbound(points, 7, objectLowerCmp)).to.equal(3);
	});
});
