import { expect } from 'chai';
import { describe, it } from 'vitest';

import { PercentageFormatter } from '../../src/formatters/percentage-formatter';

describe('PercentageFormatter', () => {
	it('should format percentages', () => {
		const formatter = new PercentageFormatter(100);

		expect(formatter.format(50)).to.equal('50.00%');
		expect(formatter.format(0)).to.equal('0.00%');
		expect(formatter.format(100)).to.equal('100.00%');
	});

	it('should handle negative percentages', () => {
		const formatter = new PercentageFormatter(100);

		expect(formatter.format(-25)).to.equal('\u221225.00%');
	});

	it('should respect priceScale', () => {
		const formatter = new PercentageFormatter(10);

		expect(formatter.format(12.3)).to.equal('12.3%');
	});

	it('should handle custom priceScale', () => {
		const formatter = new PercentageFormatter(1);

		expect(formatter.format(42)).to.equal('42%');
	});
});
