import { expect } from 'chai';
import { describe, it } from 'vitest';

import { VolumeFormatter } from '../../src/formatters/volume-formatter';

describe('VolumeFormatter', () => {
	it('should format small volumes', () => {
		const formatter = new VolumeFormatter(2);

		expect(formatter.format(123)).to.equal('123');
		expect(formatter.format(994)).to.equal('994');
	});

	it('should format thousands with K', () => {
		const formatter = new VolumeFormatter(2);

		expect(formatter.format(1000)).to.equal('1K');
		expect(formatter.format(1500)).to.equal('1.5K');
		expect(formatter.format(994999)).to.equal('995K');
	});

	it('should format millions with M', () => {
		const formatter = new VolumeFormatter(2);

		expect(formatter.format(1000000)).to.equal('1M');
		expect(formatter.format(2500000)).to.equal('2.5M');
	});

	it('should format billions with B', () => {
		const formatter = new VolumeFormatter(2);

		expect(formatter.format(1000000000)).to.equal('1B');
		expect(formatter.format(5600000000)).to.equal('5.6B');
	});

	it('should handle precision', () => {
		const formatter = new VolumeFormatter(0);

		expect(formatter.format(1500)).to.equal('2K');
	});

	it('should remove trailing zeros', () => {
		const formatter = new VolumeFormatter(3);

		expect(formatter.format(1500)).to.equal('1.5K');
	});

	it('should handle negative volumes', () => {
		const formatter = new VolumeFormatter(2);

		expect(formatter.format(-1000)).to.equal('-1K');
		expect(formatter.format(-500)).to.equal('-500');
	});

	it('should handle zero', () => {
		const formatter = new VolumeFormatter(2);

		expect(formatter.format(0)).to.equal('0');
	});
});
