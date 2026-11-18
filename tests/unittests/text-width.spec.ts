import { expect } from 'chai';
import { describe, it } from 'vitest';

import { labelMetrics, textWidth } from '../../src/draw/labels';

function context(widthOf: (text: string) => number): { ctx: CanvasRenderingContext2D; measured: string[] } {
	const measured: string[] = [];
	const ctx = {
		measureText: (text: string) => {
			measured.push(text);
			return { width: widthOf(text) };
		},
	} as unknown as CanvasRenderingContext2D;
	return { ctx, measured };
}

describe('textWidth', () => {
	it('measures a text one time', () => {
		labelMetrics({ fontSize: 11, fontFamily: 'a' } as never);
		const { ctx, measured } = context((text: string) => text.length * 7);
		expect(textWidth(ctx, 'hello')).to.equal(35);
		expect(textWidth(ctx, 'hello')).to.equal(35);
		expect(measured).to.deep.equal(['hello']);
	});

	it('uses one measurement for numbers with the same number of digits', () => {
		labelMetrics({ fontSize: 11, fontFamily: 'b' } as never);
		const { ctx, measured } = context((text: string) => text.length * 7);
		// "1" is not replaced: it is narrower than the other digits in many fonts
		expect(textWidth(ctx, '243.45')).to.equal(42);
		expect(textWidth(ctx, '987.65')).to.equal(42);
		expect(textWidth(ctx, '123.45')).to.equal(42);
		expect(measured).to.deep.equal(['000.00', '100.00']);
	});

	it('does not keep a width of 0', () => {
		labelMetrics({ fontSize: 11, fontFamily: 'c' } as never);
		const zero = context(() => 0);
		expect(textWidth(zero.ctx, 'text')).to.equal(0);
		const real = context(() => 20);
		expect(textWidth(real.ctx, 'text')).to.equal(20);
	});

	it('measures again after a change of the font', () => {
		labelMetrics({ fontSize: 11, fontFamily: 'd' } as never);
		const first = context(() => 20);
		textWidth(first.ctx, 'text');
		labelMetrics({ fontSize: 12, fontFamily: 'd' } as never);
		const second = context(() => 30);
		expect(textWidth(second.ctx, 'text')).to.equal(30);
	});
});
