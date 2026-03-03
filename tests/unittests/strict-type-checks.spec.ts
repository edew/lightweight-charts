import { expect } from 'chai';
import { describe, it } from 'vitest';

import {
	clone,
	isBoolean,
	isInteger,
	isNaN,
	isNumber,
	isString,
	merge,
	notNull,
	undefinedIfNull,
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

			const result = merge(dst, src);
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
			merge(dst, src);
			expect(dst).to.deep.equal({ a: 1, nested: { v: 3 } });
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

	describe('null helpers', () => {
		it('notNull narrows out null values', () => {
			const values = [1, null, 3].filter(notNull);
			expect(values).to.deep.equal([1, 3]);
		});

		it('undefinedIfNull converts null to undefined', () => {
			expect(undefinedIfNull(10)).to.equal(10);
			expect(undefinedIfNull(null)).to.equal(undefined);
		});
	});
});
