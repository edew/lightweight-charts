import { expect } from 'chai';
import { describe, it } from 'vitest';

import { TickMarks } from '../../src/model/time-scale/tick-marks';
import type { TickMark, UTCTimestamp } from '../../src/model/time-scale/time-data';

function mark(index: number, span: number, timestamp: number): TickMark {
	return {
		index: index as any,
		span,
		time: { timestamp: timestamp as UTCTimestamp },
	};
}

describe('TickMarks', () => {
	it('indexToTime returns null for missing marks and time for existing marks', () => {
		const marks = new TickMarks();
		expect(marks.indexToTime(1)).to.equal(null);

		marks.merge([mark(1, 10, 100)]);
		expect(marks.indexToTime(1)!.timestamp).to.equal(100);
	});

	it('merge updates existing mark time when index and span match', () => {
		const marks = new TickMarks();
		marks.merge([mark(2, 20, 100)]);
		marks.merge([mark(2, 20, 200)]);
		expect(marks.indexToTime(2)!.timestamp).to.equal(200);
	});

	it('merge replaces mark when same index but different span', () => {
		const marks = new TickMarks();
		marks.merge([mark(3, 20, 100)]);
		marks.merge([mark(3, 30, 150)]);
		expect(marks.indexToTime(3)!.timestamp).to.equal(150);
	});

	it('build returns cached array when spacing and width imply same maxBar', () => {
		const marks = new TickMarks();
		marks.merge([mark(0, 10, 100), mark(5, 10, 200), mark(10, 10, 300)]);

		const first = marks.build(5, 50); // maxBar = 10
		const second = marks.build(5, 50); // same maxBar, should return cache
		expect(second).to.equal(first);
	});

	it('build spacing filter keeps distance by maxBar', () => {
		const marks = new TickMarks();
		marks.merge([mark(0, 10, 100), mark(3, 10, 200), mark(6, 10, 300), mark(9, 10, 400)]);

		const built = marks.build(3, 18); // maxBar = 6
		const indexes = built.map((m) => m.index);
		expect(indexes).to.deep.equal([0, 6]);
	});

	it('reset clears all marks', () => {
		const marks = new TickMarks();
		marks.merge([mark(1, 10, 100)]);
		expect(marks.indexToTime(1)).to.not.equal(null);

		marks.reset();
		expect(marks.indexToTime(1)).to.equal(null);
		expect(marks.build(1, 10)).to.deep.equal([]);
	});
});
