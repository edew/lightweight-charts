import { expect } from 'chai';
import { describe, it } from 'vitest';

import { DateFormatter } from '../../src/formatters/date-formatter';

describe('DateFormatter', () => {
	it('should format dates with default format (yyyy-MM-dd)', () => {
		const formatter = new DateFormatter();
		const date = new Date(2023, 0, 15);
		expect(formatter.format(date)).to.equal('2023-01-15');
	});

	it('should format dates with dd MMM \'yy format', () => {
		const formatter = new DateFormatter('dd MMM \'yy', 'en-US');
		const date = new Date(2023, 0, 15);

		expect(formatter.format(date)).to.equal('15 Jan \'23');
	});

	it('should respect locale', () => {
		const formatterUS = new DateFormatter('dd MMM \'yy', 'en-US');
		const formatterFR = new DateFormatter('dd MMM \'yy', 'fr-FR');
		const date = new Date(2023, 0, 15);

		const us = formatterUS.format(date);
		const fr = formatterFR.format(date);

		expect(us).to.equal('15 Jan \'23');
		expect(fr).to.equal('15 janv. \'23');
	});
});
