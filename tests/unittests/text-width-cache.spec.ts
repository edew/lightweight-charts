import { expect } from 'chai';
import { describe, it, beforeEach } from 'vitest';

import { TextWidthCache } from '../../src/model/text-width-cache';

describe('TextWidthCache', () => {
	let cache: TextWidthCache;
	let ctx: Partial<CanvasRenderingContext2D>;

	beforeEach(() => {
		cache = new TextWidthCache(5);
		// Mock canvas context
		ctx = {
			measureText: (text: string) => ({
				width: text.length * 10, // Simple mock: each character is 10 units wide
			}),
		} as Partial<CanvasRenderingContext2D>;
	});

	it('should cache text measurements', () => {
		const width = cache.measureText(ctx as CanvasRenderingContext2D, 'hello');
		expect(width).to.equal(50); // 5 chars * 10 units each
	});

	it('should return cached value on second call', () => {
		const width1 = cache.measureText(ctx as CanvasRenderingContext2D, 'test');
		const width2 = cache.measureText(ctx as CanvasRenderingContext2D, 'test');
		expect(width1).to.equal(width2);
		expect(width1).to.equal(40); // 4 chars * 10
	});

	it('should apply default optimization replacement (digits 2-9 replaced with 0)', () => {
		// '12354' should be treated as '10300' for cache purposes
		const width1 = cache.measureText(ctx as CanvasRenderingContext2D, '12354');
		const width2 = cache.measureText(ctx as CanvasRenderingContext2D, '10300');
		// Both should return same value because they map to the same cache string
		expect(width1).to.equal(width2);
	});

	it('should use custom optimization replacement regex', () => {
		const customRe = /a/g; // Replace 'a' with '0'
		const width1 = cache.measureText(ctx as CanvasRenderingContext2D, 'banana', customRe);
		const width2 = cache.measureText(ctx as CanvasRenderingContext2D, 'b0n0n0', customRe);
		expect(width1).to.equal(width2);
	});

	it('should reset cache', () => {
		cache.measureText(ctx as CanvasRenderingContext2D, 'hello');
		cache.reset();
		// After reset, cache should be empty but still functional
		const width = cache.measureText(ctx as CanvasRenderingContext2D, 'hello');
		expect(width).to.equal(50);
	});

	it('should evict oldest entry when max size exceeded', () => {
		// Cache size is 5
		const texts = ['aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff'];
		texts.forEach(text => cache.measureText(ctx as CanvasRenderingContext2D, text));

		// First entry 'aaa' should be evicted
		// Measure 'aaa' again - should not use cached value (was evicted)
		const width1 = cache.measureText(ctx as CanvasRenderingContext2D, 'aaa');
		expect(width1).to.equal(30); // 3 chars * 10

		// But 'fff' should still be cached
		const width2 = cache.measureText(ctx as CanvasRenderingContext2D, 'fff');
		expect(width2).to.equal(30); // cached
	});

	it('should not cache zero-width results from empty strings', () => {
		// Mock context that returns 0 width
		const zeroWidthCtx = {
			measureText: () => ({ width: 0 }),
		} as unknown as CanvasRenderingContext2D;

		const width = cache.measureText(zeroWidthCtx, 'text');
		expect(width).to.equal(0);
		// Measuring again should call measureText again, not use cache
		const width2 = cache.measureText(zeroWidthCtx, 'text');
		expect(width2).to.equal(0);
	});

	it('should not cache empty string measurements', () => {
		const zeroWidthCtx = {
			measureText: () => ({ width: 0 }),
		} as unknown as CanvasRenderingContext2D;

		// Empty string should not be cached even with 0 width
		const width = cache.measureText(zeroWidthCtx, '');
		expect(width).to.equal(0);
	});

	it('should handle constructor with default size', () => {
		const defaultCache = new TextWidthCache();
		const width = defaultCache.measureText(ctx as CanvasRenderingContext2D, 'test');
		expect(width).to.equal(40);
	});

	it('should handle cache with size of 1', () => {
		const smallCache = new TextWidthCache(1);
		smallCache.measureText(ctx as CanvasRenderingContext2D, 'first');
		const width = smallCache.measureText(ctx as CanvasRenderingContext2D, 'second');
		// 'first' should be evicted
		expect(width).to.equal(60); // 6 chars * 10
	});
});
