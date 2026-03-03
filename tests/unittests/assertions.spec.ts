import { expect } from 'chai';
import { describe, it } from 'vitest';

import { assert, ensure, ensureDefined, ensureNotNull } from '../../src/helpers/assertions';

describe('assertions', () => {
	it('assert does not throw when condition is true', () => {
		expect(() => assert(true)).to.not.throw();
	});

	it('assert throws with base message and optional detail', () => {
		expect(() => assert(false)).to.throw('Assertion failed');
		expect(() => assert(false, 'broken')).to.throw('Assertion failed: broken');
	});

	it('ensureDefined returns value and throws on undefined', () => {
		expect(ensureDefined(123)).to.equal(123);
		expect(() => ensureDefined(undefined)).to.throw('Value is undefined');
	});

	it('ensureNotNull returns value and throws on null', () => {
		expect(ensureNotNull('ok')).to.equal('ok');
		expect(() => ensureNotNull(null)).to.throw('Value is null');
	});

	it('ensure returns value and throws on null/undefined', () => {
		expect(ensure(0)).to.equal(0);
		expect(() => ensure(null)).to.throw('Value is null');
		expect(() => ensure(undefined)).to.throw('Value is undefined');
	});
});
