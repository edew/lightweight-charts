import { expect } from 'chai';
import { describe, it } from 'vitest';

import { Delegate } from '../../src/helpers/delegate';

describe('Delegate', () => {
	it('subscribes and fires listeners in subscription order', () => {
		const delegate = new Delegate<number, string>();
		const calls: string[] = [];

		delegate.subscribe((value, text) => {
			calls.push(`first:${value}:${text}`);
		});
		delegate.subscribe((value, text) => {
			calls.push(`second:${value}:${text}`);
		});

		delegate.fire(7, 'ok');
		expect(calls).to.deep.equal(['first:7:ok', 'second:7:ok']);
	});

	it('unsubscribe removes only the requested callback', () => {
		const delegate = new Delegate<number, void>();
		let a = 0;
		let b = 0;

		const callbackA = () => {
			a += 1;
		};
		const callbackB = () => {
			b += 1;
		};

		delegate.subscribe(callbackA);
		delegate.subscribe(callbackB);
		delegate.unsubscribe(callbackA);

		delegate.fire(1, undefined);
		expect(a).to.equal(0);
		expect(b).to.equal(1);
	});

	it('unsubscribeAll removes listeners bound to a linked object', () => {
		const delegate = new Delegate<void, void>();
		const linkedA = {};
		const linkedB = {};
		let countA = 0;
		let countB = 0;

		delegate.subscribe(() => {
			countA += 1;
		}, linkedA);
		delegate.subscribe(() => {
			countB += 1;
		}, linkedB);

		delegate.unsubscribeAll(linkedA);
		delegate.fire(undefined, undefined);

		expect(countA).to.equal(0);
		expect(countB).to.equal(1);
	});

	it('singleshot listeners are removed after first fire', () => {
		const delegate = new Delegate<void, void>();
		let count = 0;

		delegate.subscribe(() => {
			count += 1;
		}, undefined, true);

		delegate.fire(undefined, undefined);
		delegate.fire(undefined, undefined);

		expect(count).to.equal(1);
		expect(delegate.hasListeners()).to.equal(false);
	});

	it('destroy clears all listeners', () => {
		const delegate = new Delegate<void, void>();
		let count = 0;
		delegate.subscribe(() => {
			count += 1;
		});

		expect(delegate.hasListeners()).to.equal(true);
		delegate.destroy();
		expect(delegate.hasListeners()).to.equal(false);

		delegate.fire(undefined, undefined);
		expect(count).to.equal(0);
	});

	it('new subscriptions during fire are not called until next fire', () => {
		const delegate = new Delegate<number, void>();
		const calls: string[] = [];

		const lateCallback = (value: number) => {
			calls.push(`late:${value}`);
		};

		delegate.subscribe((value) => {
			calls.push(`early:${value}`);
			delegate.subscribe(lateCallback);
		});

		delegate.fire(1, undefined);
		expect(calls).to.deep.equal(['early:1']);

		delegate.fire(2, undefined);
		expect(calls).to.deep.equal(['early:1', 'early:2', 'late:2']);
	});
});
