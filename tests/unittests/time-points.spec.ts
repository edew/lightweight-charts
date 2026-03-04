import { expect } from 'chai';
import { describe, it } from 'vitest';

import { TimePoints } from '../../src/model/time-scale/time-points';
import type { TimePoint, TimePointIndex, UTCTimestamp } from '../../src/model/time-scale/time-data';

function point(timestamp: number): TimePoint {
	return { timestamp: timestamp as UTCTimestamp };
}

describe('TimePoints', () => {
	it('is empty initially and clears correctly', () => {
		const points = new TimePoints();
		expect(points.size()).to.equal(0);
		expect(points.firstIndex()).to.equal(null);
		expect(points.lastIndex()).to.equal(null);

		points.merge(0 as TimePointIndex, [point(1), point(2)]);
		expect(points.size()).to.equal(2);
		points.clear();
		expect(points.size()).to.equal(0);
		expect(points.firstIndex()).to.equal(null);
		expect(points.lastIndex()).to.equal(null);
	});

	it('merge fills empty items and appends beyond range', () => {
		const points = new TimePoints();
		points.merge(0 as TimePointIndex, [point(10), point(20)]);
		expect(points.size()).to.equal(2);
		expect(points.valueAt(0 as TimePointIndex)!.timestamp).to.equal(10);
		expect(points.valueAt(1 as TimePointIndex)!.timestamp).to.equal(20);

		points.merge(1 as TimePointIndex, [point(30), point(40), point(50)]);
		expect(points.size()).to.equal(4);
		expect(points.valueAt(0 as TimePointIndex)!.timestamp).to.equal(10);
		expect(points.valueAt(1 as TimePointIndex)!.timestamp).to.equal(30);
		expect(points.valueAt(2 as TimePointIndex)!.timestamp).to.equal(40);
		expect(points.valueAt(3 as TimePointIndex)!.timestamp).to.equal(50);
	});

	it('merge with negative start follows current assignment semantics', () => {
		const points = new TimePoints();
		points.merge(0 as TimePointIndex, [point(100), point(200)]);
		points.merge(-1 as TimePointIndex, [point(50), point(100)]);

		expect(points.size()).to.equal(3);
		expect(points.valueAt(0 as TimePointIndex)!.timestamp).to.equal(100);
		expect(points.valueAt(1 as TimePointIndex)!.timestamp).to.equal(100);
		expect(points.valueAt(2 as TimePointIndex)!.timestamp).to.equal(200);
	});

	it('merge with too-short values and negative start keeps data unchanged', () => {
		const points = new TimePoints();
		points.merge(0 as TimePointIndex, [point(10), point(20)]);
		points.merge(-2 as TimePointIndex, [point(1)]);

		expect(points.size()).to.equal(2);
		expect(points.valueAt(0 as TimePointIndex)!.timestamp).to.equal(10);
		expect(points.valueAt(1 as TimePointIndex)!.timestamp).to.equal(20);
	});

	it('valueAt returns null when index is outside range', () => {
		const points = new TimePoints();
		points.merge(0 as TimePointIndex, [point(1)]);
		expect(points.valueAt(-1 as TimePointIndex)).to.equal(null);
		expect(points.valueAt(2 as TimePointIndex)).to.equal(null);
	});

	it('indexOf supports exact and nearest modes', () => {
		const points = new TimePoints();
		points.merge(0 as TimePointIndex, [point(10), point(20), point(30)]);

		expect(points.indexOf(20 as UTCTimestamp, false)).to.equal(1);
		expect(points.indexOf(25 as UTCTimestamp, false)).to.equal(null);
		expect(points.indexOf(25 as UTCTimestamp, true)).to.equal(2);
		expect(points.indexOf(31 as UTCTimestamp, false)).to.equal(null);
		expect(points.indexOf(31 as UTCTimestamp, true)).to.equal(2);
	});

	it('closestIndexLeft follows current comparison behavior', () => {
		const points = new TimePoints();
		points.merge(0 as TimePointIndex, [point(10), point(20), point(30), point(40)]);

		expect(points.closestIndexLeft(point(5))).to.equal(3);
		expect(points.closestIndexLeft(point(10))).to.equal(3);
		expect(points.closestIndexLeft(point(25))).to.equal(3);
		expect(points.closestIndexLeft(point(40))).to.equal(3);
		expect(points.closestIndexLeft(point(100))).to.equal(3);
		expect(points.closestIndexLeft({ timestamp: Number.NaN as UTCTimestamp })).to.equal(null);
	});
});
