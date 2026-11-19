/** The same type with all members optional, at each level. A function and an array of the source replace the destination. */
export type DeepPartial<T> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[P in keyof T]?: T[P] extends (...args: any[]) => unknown
		? T[P]
		: T[P] extends Array<infer U>
		? Array<DeepPartial<U>>
		: T[P] extends ReadonlyArray<infer X>
		? ReadonlyArray<DeepPartial<X>>
		: DeepPartial<T[P]>
};

/** Copies the members of each source into `dst`, at each level. A member that is `undefined` is ignored. */
export function merge<T extends object>(dst: T, ...sources: DeepPartial<T>[]): T {
	mergeInto(dst, sources);
	return dst;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeInto(dst: Record<string, any>, sources: Record<string, any>[]): void {
	for (const src of sources) {
		for (const i in src) {
			if (src[i] === undefined) {
				continue;
			}

			if ('object' !== typeof src[i] || src[i] === null) {
				dst[i] = src[i];
			} else if (dst[i] === undefined) {
				// a copy: the destination must not share objects with the source
				dst[i] = clone(src[i]);
			} else {
				mergeInto(dst[i], [src[i]]);
			}
		}
	}
}

export function isNumber(value: unknown): value is number {
	return (typeof value === 'number') && (isFinite(value));
}

export function isInteger(value: unknown): boolean {
	return (typeof value === 'number') && ((value % 1) === 0);
}

export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

export function isNaN(value: number): boolean {
	return !(value <= 0) && !(value > 0);
}

export function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

export function clone<T>(object: T): T {
	
	const o = object as any;
	if (!o || 'object' !== typeof o) {
		return o;
	}

	
	let c: any;

	if (Array.isArray(o)) {
		c = [];
	} else {
		c = {};
	}

	let p;
	let v;
	for (p in o) {
		if (o.hasOwnProperty(p)) {
			v = o[p];
			if (v && 'object' === typeof v) {
				c[p] = clone(v);
			} else {
				c[p] = v;
			}
		}
	}

	return c;
}
