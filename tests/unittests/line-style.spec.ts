import { expect } from 'chai';
import { describe, it } from 'vitest';

import { hairline, LineStyle, setLineStyle } from '../../src/draw/line-style';

import { createRecordingContext } from '../helpers/recording-context';

describe('line style', () => {
	it('sets the width and the dash pattern together', () => {
		const recording = createRecordingContext();
		const offset = setLineStyle(recording.ctx, LineStyle.Dashed, 3);
		expect(recording.log).to.deep.equal(['lineWidth=3', 'setLineDash([6,6])']);
		// a line with an odd width is sharp when it is on the center of a pixel
		expect(offset).to.equal(0.5);
	});

	it('gives each style its pattern', () => {
		const patterns: [LineStyle, string][] = [
			[LineStyle.Solid, '[]'],
			[LineStyle.Dotted, '[2,2]'],
			[LineStyle.Dashed, '[4,4]'],
			[LineStyle.LargeDashed, '[12,12]'],
			[LineStyle.SparseDotted, '[2,8]'],
		];
		for (const [style, pattern] of patterns) {
			const recording = createRecordingContext();
			expect(setLineStyle(recording.ctx, style, 2)).to.equal(0);
			expect(recording.log[1]).to.equal(`setLineDash(${pattern})`);
		}
	});

	it('a line is at least one device pixel wide', () => {
		expect(hairline(0.75)).to.equal(1);
		expect(hairline(2.5)).to.equal(2);
		expect(hairline(1.5, 3)).to.equal(4);
	});
});
