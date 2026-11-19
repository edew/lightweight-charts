import { expect } from 'chai';
import { describe, it } from 'vitest';

import { bindPointerEvents, type PointerHandlers } from '../../src/gui/pointer-events';

// The event target of Node, with the two element methods that the code calls.
// The element is at the origin of the page.
class FakeElement extends EventTarget {
	public getBoundingClientRect(): { left: number; top: number } {
		return { left: 0, top: 0 };
	}

	public setPointerCapture(): void {}
}

interface Gestures {
	calls: string[];
	send(type: string, pointerId: number, x: number, y: number, pointerType?: string): void;
}

function createGestures(): Gestures {
	const calls: string[] = [];
	const record = (name: string) => (...args: unknown[]) => { calls.push(`${name}(${args.join(',')})`); };
	const handlers: PointerHandlers = {
		hover: record('hover'),
		leave: record('leave'),
		down: record('down'),
		drag: record('drag'),
		up: record('up'),
		click: record('click'),
		doubleClick: record('doubleClick'),
		longTap: record('longTap'),
		pinchStart: record('pinchStart'),
		pinch: record('pinch'),
	};
	const element = new FakeElement();
	bindPointerEvents(element as unknown as HTMLElement, handlers, new AbortController().signal);

	return {
		calls,
		send(type: string, pointerId: number, x: number, y: number, pointerType: string = 'touch'): void {
			element.dispatchEvent(Object.assign(new Event(type), { pointerId, pointerType, clientX: x, clientY: y, button: 0 }));
		},
	};
}

describe('pointer events', () => {
	it('a press, a move and a release are a drag', () => {
		const gestures = createGestures();
		gestures.send('pointerdown', 1, 100, 100, 'mouse');
		gestures.send('pointermove', 1, 120, 100, 'mouse');
		gestures.send('pointerup', 1, 120, 100, 'mouse');
		expect(gestures.calls).to.deep.equal(['down(100,100,false)', 'drag(120,100,false)', 'up()']);
	});

	it('a press and a release at one place are a click', () => {
		const gestures = createGestures();
		gestures.send('pointerdown', 1, 100, 100, 'mouse');
		gestures.send('pointerup', 1, 101, 100, 'mouse');
		expect(gestures.calls).to.deep.equal(['down(100,100,false)', 'up()', 'click(101,100)']);
	});

	it('the finger that stays down after a pinch does not drag the chart', () => {
		const gestures = createGestures();
		gestures.send('pointerdown', 1, 100, 100);
		gestures.send('pointerdown', 2, 200, 100);
		gestures.send('pointermove', 2, 300, 100);
		// the first finger goes up: the second finger is 200 pixels away from the start of the press
		gestures.send('pointerup', 1, 100, 100);
		gestures.send('pointermove', 2, 310, 100);
		gestures.send('pointerup', 2, 310, 100);

		expect(gestures.calls).to.deep.equal(['down(100,100,true)', 'pinchStart()', 'pinch(200,2)', 'up()']);
	});
});
