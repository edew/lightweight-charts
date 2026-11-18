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

	it('builds again when the generation or the distance changes', () => {
		const marks = new TickMarks();
		const spans = new Uint8Array([20, 20, 20, 20, 20, 20, 20, 20]);
		expect(Array.from(marks.build(spans, 8, 1, 1, 2).indexes.subarray(0, 4))).to.deep.equal([0, 2, 4, 6]);
		expect(marks.build(spans, 8, 1, 1, 4).count).to.equal(2);
		spans[1] = 70;
		expect(Array.from(marks.build(spans, 8, 2, 1, 4).indexes.subarray(0, 2))).to.deep.equal([1, 5]);
	});

	it('gives the same marks for appended time points as a build of all time points', () => {
		// fixed pseudo-random weights with some high weights
		let seed = 12345;
		const random = (): number => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
			return seed / 4294967296;
		};
		const weights = [19, 20, 20, 20, 21, 21, 22, 30, 31, 33, 50, 50, 60, 70];
		const total = 4000;
		const spans = new Uint8Array(total);
		for (let i = 0; i < total; i++) {
			spans[i] = random() < 0.7 ? 20 : weights[Math.floor(random() * weights.length)];
		}

		for (const minDistance of [1, 2, 5, 13, 40]) {
			const incremental = new TickMarks();
			let length = 100;
			while (length <= total) {
				const result = incremental.build(spans, length, 0, 1, minDistance);
				const full = new TickMarks().build(spans, length, 0, 1, minDistance);
				expect(Array.from(result.indexes.subarray(0, result.count)), `distance ${minDistance}, length ${length}`)
					.to.deep.equal(Array.from(full.indexes.subarray(0, full.count)));
				// add 1 to 30 time points
				length += 1 + Math.floor(random() * 30);
			}
		}
	});

	it('builds again after reset', () => {
		const marks = new TickMarks();
		const spans = new Uint8Array([20, 20, 20]);
		expect(marks.build(spans, 3, 1, 1, 1).count).to.equal(3);
		// the caller changed the weights and says so with reset()
		spans[1] = 70;
		spans[2] = 70;
		marks.reset();
		expect(Array.from(marks.build(spans, 3, 1, 1, 2).indexes.subarray(0, 1))).to.deep.equal([1]);
	});
});
