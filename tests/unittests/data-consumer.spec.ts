import { expect } from 'chai';
import { describe, it } from 'vitest';

import { isBusinessDay, isUTCTimestamp, type Time } from '../../src/api/data-consumer';

describe('data-consumer time guards', () => {
	it('detects UTC timestamp numbers', () => {
		const ts = 1700000000 as Time;
		expect(isUTCTimestamp(ts)).to.equal(true);
		expect(isBusinessDay(ts)).to.equal(false);
	});

	it('detects business day objects', () => {
		const day = { year: 2026, month: 3, day: 3 } as Time;
		expect(isBusinessDay(day)).to.equal(true);
		expect(isUTCTimestamp(day)).to.equal(false);
	});

	it('treats string date as non-business-day and non-timestamp', () => {
		const strTime = '2026-03-03' as Time;
		expect(isBusinessDay(strTime)).to.equal(false);
		expect(isUTCTimestamp(strTime)).to.equal(false);
	});
});
