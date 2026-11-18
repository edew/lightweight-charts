import { expect } from 'chai';
import { describe, it } from 'vitest';

import { FormattedLabelsCache } from '../../src/model/time-scale/formatted-labels-cache';

describe('FormattedLabelsCache', () => {
	it('formats a value one time and then returns the cached text', () => {
		let calls = 0;
		const cache = new FormattedLabelsCache((value: number) => {
			calls++;
			return `v${value}`;
		});

		expect(cache.format(10)).to.equal('v10');
		expect(cache.format(10)).to.equal('v10');
		expect(cache.format(20)).to.equal('v20');
		expect(calls).to.equal(2);
	});

	it('removes the value that was added first when the cache is full', () => {
		const formatted: number[] = [];
		const cache = new FormattedLabelsCache((value: number) => {
			formatted.push(value);
			return String(value);
		}, 2);

		cache.format(1);
		cache.format(2);
		cache.format(3); // removes 1
		cache.format(2); // still in the cache
		cache.format(1); // must be formatted again, removes 2
		cache.format(3); // still in the cache

		expect(formatted).to.deep.equal([1, 2, 3, 1]);
	});

	it('has a default size of 50', () => {
		let calls = 0;
		const cache = new FormattedLabelsCache((value: number) => {
			calls++;
			return String(value);
		});

		for (let i = 0; i < 50; i++) {
			cache.format(i);
		}
		cache.format(0);
		expect(calls).to.equal(50);
		cache.format(50);
		cache.format(0);
		expect(calls).to.equal(52);
	});
});
