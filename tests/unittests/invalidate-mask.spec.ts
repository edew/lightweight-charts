import { expect } from 'chai';
import { describe, it } from 'vitest';

import { InvalidateMask, InvalidationLevel } from '../../src/model/invalidate-mask';
import type { UTCTimestamp } from '../../src/model/time-scale/time-data';

describe('InvalidateMask', () => {
	it('returns global invalidation for non-invalidated pane', () => {
		const mask = new InvalidateMask(InvalidationLevel.Light);
		const paneInv = mask.invalidateForPane(0);
		expect(paneInv.level).to.equal(InvalidationLevel.Light);
		expect(paneInv.autoScale).to.equal(undefined);
	});

	it('merges pane invalidation levels and autoscale flags', () => {
		const mask = new InvalidateMask(InvalidationLevel.None);
		mask.invalidatePane(1, { level: InvalidationLevel.Cursor });
		mask.invalidatePane(1, { level: InvalidationLevel.Light, autoScale: true });

		const paneInv = mask.invalidateForPane(1);
		expect(paneInv.level).to.equal(InvalidationLevel.Light);
		expect(paneInv.autoScale).to.equal(true);
	});

	it('invalidateAll raises global level to max', () => {
		const mask = new InvalidateMask(InvalidationLevel.Cursor);
		mask.invalidateAll(InvalidationLevel.Full);
		expect(mask.fullInvalidation()).to.equal(InvalidationLevel.Full);
	});

	it('setFitContent resets target time range', () => {
		const mask = new InvalidateMask(InvalidationLevel.Light);
		mask.setTargetTimeRange({ from: { timestamp: 10 as UTCTimestamp }, to: { timestamp: 15 as UTCTimestamp } });
		expect(mask.getTargetTimeRange()).to.not.equal(null);

		mask.setFitContent();
		expect(mask.getFitContent()).to.equal(true);
		expect(mask.getTargetTimeRange()).to.equal(null);
	});

	it('setTargetTimeRange resets fitContent', () => {
		const mask = new InvalidateMask(InvalidationLevel.Light);
		mask.setFitContent();
		mask.setTargetTimeRange({ from: { timestamp: 20 as UTCTimestamp }, to: { timestamp: 25 as UTCTimestamp } });
		expect(mask.getFitContent()).to.equal(false);
		expect(mask.getTargetTimeRange()).to.deep.equal({ from: { timestamp: 20 as UTCTimestamp }, to: { timestamp: 25 as UTCTimestamp } });
	});

	it('merge combines global levels, pane invalidation and action flags', () => {
		const first = new InvalidateMask(InvalidationLevel.Cursor);
		first.invalidatePane(0, { level: InvalidationLevel.Light });
		first.setFitContent();

		const second = new InvalidateMask(InvalidationLevel.Full);
		second.invalidatePane(0, { level: InvalidationLevel.Full, autoScale: true });
		second.invalidatePane(1, { level: InvalidationLevel.Light });

		first.merge(second);

		expect(first.fullInvalidation()).to.equal(InvalidationLevel.Full);
		expect(first.invalidateForPane(0)).to.deep.equal({
			level: InvalidationLevel.Full,
			autoScale: true,
		});
		expect(first.invalidateForPane(1).level).to.equal(InvalidationLevel.Full);
		expect(first.getFitContent()).to.equal(true);
	});

	it('merge applies incoming target time range and overrides fitContent', () => {
		const first = new InvalidateMask(InvalidationLevel.Light);
		first.setFitContent();

		const second = new InvalidateMask(InvalidationLevel.Light);
		const range = { from: { timestamp: 3 as UTCTimestamp }, to: { timestamp: 9 as UTCTimestamp } };
		second.setTargetTimeRange(range);

		first.merge(second);

		expect(first.getFitContent()).to.equal(false);
		expect(first.getTargetTimeRange()).to.deep.equal(range);
	});
});
