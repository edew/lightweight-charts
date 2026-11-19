import { expect } from 'chai';
import { describe, it } from 'vitest';

import {
	clone,
	type DeepPartial,
	isBoolean,
	isInteger,
	isNaN,
	isNumber,
	isString,
	merge,
} from '../../src/helpers/strict-type-checks';

describe('strict-type-checks', () => {
	describe('merge', () => {
		it('deep merges nested objects', () => {
			const dst = {
				level1: {
					left: 1,
					shared: { a: 1 },
				},
			};
			const src = {
				level1: {
					right: 2,
					shared: { b: 2 },
				},
			};

			const result = merge<object>(dst, src);
			expect(result).to.equal(dst);
			expect(dst).to.deep.equal({
				level1: {
					left: 1,
					right: 2,
					shared: { a: 1, b: 2 },
				},
			});
		});

		it('ignores undefined source values', () => {
			const dst = { x: 1, y: 2 };
			const src = { x: undefined, y: 5 };
			merge(dst, src as unknown as Record<string, any>);
			expect(dst).to.deep.equal({ x: 1, y: 5 });
		});

		it('replaces values when destination key is missing', () => {
			const dst = { a: 1 };
			const src = { nested: { v: 3 } };
			merge<object>(dst, src);
			expect(dst).to.deep.equal({ a: 1, nested: { v: 3 } });
		});

		it('does not share nested objects with the source', () => {
			const dst: Record<string, any> = {};
			const src = { nested: { v: 3 }, list: [1, 2] };
			merge(dst, src);
			expect(dst.nested).to.not.equal(src.nested);
			dst.nested.v = 4;
			dst.list.push(3);
			expect(src.nested.v).to.equal(3);
			expect(src.list).to.deep.equal([1, 2]);
		});

		it('keeps functions and null values as they are', () => {
			const fn = (): number => 1;
			const dst: Record<string, any> = { a: { b: 1 } };
			merge(dst, { fn, a: null } as Record<string, any>);
			expect(dst.fn).to.equal(fn);
			expect(dst.a).to.equal(null);
		});
	});

	describe('type guards', () => {
		it('checks numbers and integers', () => {
			expect(isNumber(10)).to.equal(true);
			expect(isNumber(Number.NaN)).to.equal(false);
			expect(isNumber(Infinity)).to.equal(false);
			expect(isNumber('10')).to.equal(false);

			expect(isInteger(10)).to.equal(true);
			expect(isInteger(-3)).to.equal(true);
			expect(isInteger(1.5)).to.equal(false);
		});

		it('checks string and boolean values', () => {
			expect(isString('abc')).to.equal(true);
			expect(isString(123)).to.equal(false);

			expect(isBoolean(true)).to.equal(true);
			expect(isBoolean(false)).to.equal(true);
			expect(isBoolean('false')).to.equal(false);
		});

		it('isNaN detects NaN and rejects finite values', () => {
			expect(isNaN(Number.NaN)).to.equal(true);
			expect(isNaN(0)).to.equal(false);
			expect(isNaN(15)).to.equal(false);
			expect(isNaN(-2)).to.equal(false);
		});
	});

	describe('clone', () => {
		it('creates a deep clone for plain objects and arrays', () => {
			const original = {
				a: 1,
				b: { nested: [1, 2, { x: 'y' }] },
			};
			const copied = clone(original);

			expect(copied).to.deep.equal(original);
			expect(copied).to.not.equal(original);
			expect(copied.b).to.not.equal(original.b);
			expect(copied.b.nested).to.not.equal(original.b.nested);
		});

		it('returns primitives as-is', () => {
			expect(clone(5)).to.equal(5);
			expect(clone('abc')).to.equal('abc');
			expect(clone(null)).to.equal(null);
		});
	});
});

describe('types', () => {
	it('DeepPartial keeps the type of a function, and merge checks its sources', () => {
		interface Options {
			size: number;
			format: { formatter: (value: number) => string };
		}
		const options: Options = { size: 1, format: { formatter: (value: number) => String(value) } };

		// @ts-expect-error an object is not a function
		const wrongFunction: DeepPartial<Options> = { format: { formatter: {} } };
		// @ts-expect-error the type of the value is wrong
		merge(options, { size: 'large' });
		// @ts-expect-error the destination has no such key
		merge(options, { colour: 'red' });

		expect(wrongFunction).to.be.an('object');
		expect(merge(options, { size: 2 }).size).to.equal(2);
	});
});
