import { expect } from 'chai';
import { describe, it } from 'vitest';

import { sortSources } from '../../src/model/data-source/sort-sources';
import type { IDataSource } from '../../src/model/data-source/idata-source';

// Mock data source for testing
class MockDataSource implements IDataSource {
	#zorder: number;

	public constructor(zorder: number) {
		this.#zorder = zorder;
	}

	public zorder(): number {
		return this.#zorder;
	}

	public setZorder(zorder: number): void {
		this.#zorder = zorder;
	}

	public priceScale() {
		return null;
	}

	public setPriceScale() {
		// no-op
	}

	public priceAxisViews() {
		return [];
	}

	public paneViews() {
		return [];
	}

	public timeAxisViews() {
		return [];
	}

	public updateAllViews(): void {
		// no-op
	}
}

describe('sortSources', () => {
	it('should sort sources by zorder in ascending order', () => {
		const source3 = new MockDataSource(3);
		const source1 = new MockDataSource(1);
		const source2 = new MockDataSource(2);

		const sources = [source3, source1, source2];
		const sorted = sortSources(sources);

		expect([]).to.be.increases
		expect(sorted[0].zorder()).to.equal(1);
		expect(sorted[1].zorder()).to.equal(2);
		expect(sorted[2].zorder()).to.equal(3);
	});

	it('should handle single source', () => {
		const source = new MockDataSource(5);
		const sorted = sortSources([source]);
		expect(sorted).to.have.lengthOf(1);
		expect(sorted[0].zorder()).to.equal(5);
	});

	it('should handle empty array', () => {
		const sorted = sortSources([]);
		expect(sorted).to.have.lengthOf(0);
	});

	it('should not modify original array', () => {
		const source1 = new MockDataSource(2);
		const source2 = new MockDataSource(1);
		const original = [source1, source2];
		const originalLength = original.length;

		sortSources(original);

		expect(original).to.have.lengthOf(originalLength);
		expect(original[0]).to.equal(source1);
		expect(original[1]).to.equal(source2);
	});

	it('should handle sources with negative zorder', () => {
		const source1 = new MockDataSource(-1);
		const source2 = new MockDataSource(0);
		const source3 = new MockDataSource(1);

		const sorted = sortSources([source3, source1, source2]);

		expect(sorted[0].zorder()).to.equal(-1);
		expect(sorted[1].zorder()).to.equal(0);
		expect(sorted[2].zorder()).to.equal(1);
	});

	it('should handle sources with equal zorder', () => {
		const source1 = new MockDataSource(5);
		const source2 = new MockDataSource(5);
		const source3 = new MockDataSource(5);

		const sorted = sortSources([source3, source1, source2]);

		expect(sorted).to.have.lengthOf(3);
		expect(sorted[0].zorder()).to.equal(5);
		expect(sorted[1].zorder()).to.equal(5);
		expect(sorted[2].zorder()).to.equal(5);
	});

	it('should handle already sorted array', () => {
		const source1 = new MockDataSource(1);
		const source2 = new MockDataSource(2);
		const source3 = new MockDataSource(3);

		const sorted = sortSources([source1, source2, source3]);

		expect(sorted[0].zorder()).to.equal(1);
		expect(sorted[1].zorder()).to.equal(2);
		expect(sorted[2].zorder()).to.equal(3);
	});

	it('should handle reverse sorted array', () => {
		const source1 = new MockDataSource(3);
		const source2 = new MockDataSource(2);
		const source3 = new MockDataSource(1);

		const sorted = sortSources([source1, source2, source3]);

		expect(sorted[0].zorder()).to.equal(1);
		expect(sorted[1].zorder()).to.equal(2);
		expect(sorted[2].zorder()).to.equal(3);
	});
});
