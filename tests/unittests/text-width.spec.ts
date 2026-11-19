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
		const metrics = labelMetrics({ fontSize: 11, fontFamily: 'a' } as never);
		const { ctx, measured } = context((text: string) => text.length * 7);
		expect(textWidth(ctx, metrics, 'hello')).to.equal(35);
		expect(textWidth(ctx, metrics, 'hello')).to.equal(35);
		expect(measured).to.deep.equal(['hello']);
	});

	it('uses one measurement for numbers with the same number of digits', () => {
		const metrics = labelMetrics({ fontSize: 11, fontFamily: 'b' } as never);
		const { ctx, measured } = context((text: string) => text.length * 7);
		// "1" is not replaced: it is narrower than the other digits in many fonts
		expect(textWidth(ctx, metrics, '243.45')).to.equal(42);
		expect(textWidth(ctx, metrics, '987.65')).to.equal(42);
		expect(textWidth(ctx, metrics, '123.45')).to.equal(42);
		expect(measured).to.deep.equal(['000.00', '100.00']);
	});

	it('does not keep a width of 0', () => {
		const metrics = labelMetrics({ fontSize: 11, fontFamily: 'c' } as never);
		const zero = context(() => 0);
		expect(textWidth(zero.ctx, metrics, 'text')).to.equal(0);
		const real = context(() => 20);
		expect(textWidth(real.ctx, metrics, 'text')).to.equal(20);
	});

	it('keeps the widths of each font', () => {
		const { ctx, measured } = context(() => 7);
		const small = { fontSize: 11, fontFamily: 'd' } as never;
		const large = { fontSize: 12, fontFamily: 'd' } as never;
		// two charts with different fonts draw in turn
		for (let frame = 0; frame < 3; frame++) {
			textWidth(ctx, labelMetrics(small), 'text');
			textWidth(ctx, labelMetrics(large), 'text');
		}
		expect(measured.length).to.equal(2);
		expect(labelMetrics(small)).to.not.equal(labelMetrics(large));
	});

	it('sets the font of the context for a measurement', () => {
		const { ctx } = context(() => 7);
		const metrics = labelMetrics({ fontSize: 13, fontFamily: 'e' } as never);
		textWidth(ctx, metrics, 'text');
		expect(ctx.font).to.equal(metrics.font);
	});
});
