import type { Callback, ISubscription } from './isubscription';

interface Listener<T1, T2> {
	callback: Callback<T1, T2>;
	linkedObject?: object;
}

export class Delegate<T1 = void, T2 = void> implements ISubscription<T1, T2> {
	// Each change makes a new array, so that fire() can go through the array that it
	// started with and needs no copy.
	#listeners: readonly Listener<T1, T2>[] = [];

	public subscribe(callback: Callback<T1, T2>, linkedObject?: object): void {
		this.#listeners = [...this.#listeners, { callback, linkedObject }];
	}

	public unsubscribe(callback: Callback<T1, T2>): void {
		const index = this.#listeners.findIndex((listener: Listener<T1, T2>) => callback === listener.callback);
		if (index > -1) {
			this.#listeners = this.#listeners.filter((_: Listener<T1, T2>, i: number) => i !== index);
		}
	}

	public unsubscribeAll(linkedObject: object): void {
		this.#listeners = this.#listeners.filter((listener: Listener<T1, T2>) => listener.linkedObject !== linkedObject);
	}

	public fire(param1: T1, param2: T2): void {
		const listeners = this.#listeners;
		for (let i = 0; i < listeners.length; i++) {
			listeners[i].callback(param1, param2);
		}
	}

	public hasListeners(): boolean {
		return this.#listeners.length > 0;
	}

	public destroy(): void {
		this.#listeners = [];
	}
}
