import { expect } from 'chai';
import { describe, it } from 'vitest';

import { TimeFormatter } from '../../src/formatters/time-formatter';

describe('TimeFormatter', () => {
	it('should format time with default format (%h:%m:%s)', () => {
		const formatter = new TimeFormatter();
		const date = new Date(Date.UTC(2023, 0, 1, 14, 30, 45));

		expect(formatter.format(date)).to.equal('14:30:45');
	});

	it('should format time with custom format', () => {
		const formatter = new TimeFormatter('%h-%m');
		const date = new Date(Date.UTC(2023, 0, 1, 9, 5, 0));

		expect(formatter.format(date)).to.equal('09-05');
	});

	it('should add leading zeros', () => {
		const formatter = new TimeFormatter('%h:%m:%s');
		const date = new Date(Date.UTC(2023, 0, 1, 1, 2, 3));

		expect(formatter.format(date)).to.equal('01:02:03');
	});

	it('should handle zero values', () => {
		const formatter = new TimeFormatter('%h:%m:%s');
		const date = new Date(Date.UTC(2023, 0, 1, 0, 0, 0));

		expect(formatter.format(date)).to.equal('00:00:00');
	});
});
