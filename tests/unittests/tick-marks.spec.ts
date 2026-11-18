import { expect } from 'chai';
import { describe, it } from 'vitest';

import { TickMarks } from '../../src/model/time-scale/tick-marks';

function build(marks: TickMarks, spans: number[], spacing: number, maxWidth: number, version: number = 0): number[] {
	const result = marks.build(new Uint8Array(spans), spans.length, version, spacing, maxWidth);
	return Array.from(result.indexes.subarray(0, result.count));
}

describe('TickMarks', () => {
	it('returns no marks for no time points', () => {
		expect(build(new TickMarks(), [], 5, 50)).to.deep.equal([]);
	});

	it('keeps the minimum distance between marks of the same weight', () => {
		// 10 time points, marks must be 6 indexes apart (18 / 3)
		expect(build(new TickMarks(), [20, 20, 20, 20, 20, 20, 20, 20, 20, 20], 3, 18)).to.deep.equal([0, 6]);
	});

	it('gives priority to the higher weight when marks compete for space', () => {
		// the first time point always has weight 20; the year mark at index 2 must win
		const result = build(new TickMarks(), [20, 20, 70, 20], 1, 3);
		expect(result).to.include(2);
		expect(result).to.not.include(0);
	});

	it('places lower weights between higher weights when there is space', () => {
		const spans = [20, 20, 20, 20, 50, 20, 20, 20, 20, 50, 20, 20];
		// marks must be 2 indexes apart
		expect(build(new TickMarks(), spans, 1, 2)).to.deep.equal([0, 2, 4, 6, 9, 11]);
	});

	it('returns the cached result for the same input', () => {
		const marks = new TickMarks();
		const spans = new Uint8Array([20, 20, 20, 20]);
		const first = marks.build(spans, 4, 1, 5, 10);
		expect(marks.build(spans, 4, 1, 5, 10)).to.equal(first);
		// a different spacing that gives the same distance in indexes
		expect(marks.build(spans, 4, 1, 5, 9)).to.equal(first);
	});

	it('builds again when the version, the length or the distance changes', () => {
		const marks = new TickMarks();
		const spans = new Uint8Array([20, 20, 20, 20, 20, 20, 20, 20]);
		const first = marks.build(spans, 4, 1, 1, 2);
		expect(marks.build(spans, 4, 2, 1, 2)).to.not.equal(first);
		expect(Array.from(marks.build(spans, 8, 2, 1, 2).indexes.subarray(0, 4))).to.deep.equal([0, 2, 4, 6]);
		expect(marks.build(spans, 8, 2, 1, 4).count).to.equal(2);
	});

	it('builds again after reset', () => {
		const marks = new TickMarks();
		const spans = new Uint8Array([20, 20]);
		const first = marks.build(spans, 2, 1, 1, 1);
		marks.reset();
		expect(marks.build(spans, 2, 1, 1, 1)).to.not.equal(first);
	});
});
