import { expect } from 'chai';
import { describe, it } from 'vitest';

import { formatDate, formatTime } from '../../src/formatters/date-format';

describe('Formatters', () => {
	it('formatDate', () => {
		const d = new Date(1516147200000);
		expect(formatDate(d, 'yyyy-MM-dd', 'en-US')).to.be.equal('2018-01-17');
		expect(formatDate(d, 'dd-MM-yyyy', 'en-US')).to.be.equal('17-01-2018');
		expect(formatDate(d, 'yy/MM/dd', 'en-US')).to.be.equal('18/01/17');
		expect(formatDate(d, 'dd MMM \'yy', 'en-US')).to.be.equal('17 Jan \'18');
		expect(formatDate(d, 'MMMM dd, yyyy', 'en-US')).to.be.equal('January 17, 2018');
		// the date is the UTC date, also at the end of the UTC day
		expect(formatDate(new Date(Date.UTC(2019, 11, 31, 23, 59, 59)), 'yyyy.MM.dd', 'en-US')).to.be.equal('2019.12.31');
	});
	it('formatDate uses the month names of the locale', () => {
		const d = new Date(Date.UTC(2020, 2, 5));
		expect(formatDate(d, 'dd MMMM yyyy', 'de-DE')).to.be.equal('05 März 2020');
	});
	it('formatTime', () => {
		const d = new Date(1538381512000);
		expect(formatTime(d, true)).to.be.equal('08:11:52');
		expect(formatTime(d, false)).to.be.equal('08:11');
	});
});
