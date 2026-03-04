import { expect } from 'chai';
import { describe, it } from 'vitest';

import { FormattedLabelsCache } from '../../src/model/time-scale/formatted-labels-cache';

describe('FormattedLabelsCache', () => {
	it('should format and cache values', () => {
		let callCount = 0;
		const format = (d: Date) => {
			callCount++;
			return d.getFullYear().toString();
		};

		const cache = new FormattedLabelsCache(format, 10);
		const date = new Date(2023, 0, 1);

		expect(cache.format(date)).to.equal('2023');
		expect(callCount).to.equal(1);

		expect(cache.format(date)).to.equal('2023');
		expect(callCount).to.equal(1);

		expect(cache.format(new Date(date.valueOf()))).to.equal('2023');
		expect(callCount).to.equal(1);
	});

	it('should evict oldest entries when cache is full', () => {
		let callCount = 0;
		const format = (d: Date) => {
			callCount++;
			return d.valueOf().toString();
		};

		const maxSize = 3;
		const cache = new FormattedLabelsCache(format, maxSize);

		const d1 = new Date(1000);
		const d2 = new Date(2000);
		const d3 = new Date(3000);
		const d4 = new Date(4000);

		cache.format(d1);
		cache.format(d2);
		cache.format(d3);

		expect(callCount).to.equal(3);

		// Next call should evict d1
		cache.format(d4);

		expect(callCount).to.equal(4);

		// d1 should be evicted, so calling it again should trigger format
		cache.format(d1);

		expect(callCount).to.equal(5);

		cache.format(d3);

		expect(callCount).to.equal(5);

		cache.format(d2);

		expect(callCount).to.equal(6);
	});

	it('should handle dates with same values', () => {
		const format = (d: Date) => d.toISOString();
		const cache = new FormattedLabelsCache(format, 5);

		const dateVal = 1672531200000;
		const s1 = cache.format(new Date(dateVal));
		const s2 = cache.format(new Date(dateVal));

		expect(s1).to.equal(s2);
	});

	it('should use default size if not specified', () => {
		const cache = new FormattedLabelsCache((d: Date) => 'test');

		expect(cache.format(new Date())).to.equal('test');
	});
});
