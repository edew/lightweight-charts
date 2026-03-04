import { expect } from 'chai';
import { describe, it } from 'vitest';

import { DateTimeFormatter } from '../../src/formatters/date-time-formatter';

describe('DateTimeFormatter', () => {
	it('should format date and time with default params', () => {
		const formatter = new DateTimeFormatter();
		const date = new Date(Date.UTC(2023, 0, 15, 12, 0, 0));

		expect(formatter.format(date)).to.equal('2023-01-15 12:00:00');
	});

	it('should respect custom separator', () => {
		const formatter = new DateTimeFormatter({ dateTimeSeparator: ', ' });
		const date = new Date(Date.UTC(2023, 0, 1, 10, 0, 0));

		expect(formatter.format(date)).to.equal('2023-01-01, 10:00:00');
	});

	it('should respect custom date and time formats', () => {
		const formatter = new DateTimeFormatter({
			dateFormat: 'yyyy/MM/dd',
			timeFormat: '%h-%m',
		});
		const date = new Date(Date.UTC(2023, 5, 1, 15, 30, 0));

		expect(formatter.format(date)).to.contain('2023/06/01 15-30');
	});
});
