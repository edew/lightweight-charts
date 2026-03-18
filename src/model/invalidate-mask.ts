import type { TimePointsRange } from './time-scale/time-data';

export const enum InvalidationLevel {
	None = 0,
	Cursor = 1,
	Light = 2,
	Full = 3,
}

export interface PaneInvalidation {
	level: InvalidationLevel;
	autoScale?: boolean;
}

function mergePaneInvalidation(beforeValue: PaneInvalidation | undefined, newValue: PaneInvalidation): PaneInvalidation {
	if (beforeValue === undefined) {
		return newValue;
	}
	const level = Math.max(beforeValue.level, newValue.level);
	const autoScale = beforeValue.autoScale || newValue.autoScale;
	return { level, autoScale };
}

export class InvalidateMask {
	#invalidatedPanes: Map<number, PaneInvalidation> = new Map();
	#globalLevel: InvalidationLevel;
	#force: boolean = false;
	#fitContent: boolean = false;
	#targetTimeRange: TimePointsRange | null = null;

	public constructor(globalLevel: InvalidationLevel) {
		this.#globalLevel = globalLevel;
	}

	public invalidatePane(paneIndex: number, invalidation: PaneInvalidation): void {
		const prevValue = this.#invalidatedPanes.get(paneIndex);
		const newValue = mergePaneInvalidation(prevValue, invalidation);
		this.#invalidatedPanes.set(paneIndex, newValue);
	}

	public invalidateAll(level: InvalidationLevel): void {
		this.#globalLevel = Math.max(this.#globalLevel, level);
	}

	public fullInvalidation(): InvalidationLevel {
		return this.#globalLevel;
	}

	public invalidateForPane(paneIndex: number): PaneInvalidation {
		const paneInvalidation = this.#invalidatedPanes.get(paneIndex);
		if (paneInvalidation === undefined) {
			return {
				level: this.#globalLevel,
			};
		}
		return {
			level: Math.max(this.#globalLevel, paneInvalidation.level),
			autoScale: paneInvalidation.autoScale,
		};
	}

	public setFitContent(): void {
		this.#fitContent = true;
		this.#targetTimeRange = null;
	}

	public getFitContent(): boolean {
		return this.#fitContent;
	}

	public setTargetTimeRange(range: TimePointsRange): void {
		this.#targetTimeRange = range;
		this.#fitContent = false;
	}

	public getTargetTimeRange(): TimePointsRange | null {
		return this.#targetTimeRange;
	}

	public merge(other: InvalidateMask): void {
		this.#force = this.#force || other.#force;
		if (other.#fitContent) {
			this.setFitContent();
		}
		if (other.#targetTimeRange) {
			this.setTargetTimeRange(other.#targetTimeRange);
		}
		this.#globalLevel = Math.max(this.#globalLevel, other.#globalLevel);
		other.#invalidatedPanes.forEach((invalidation: PaneInvalidation, index: number) => {
			this.invalidatePane(index, invalidation);
		});
	}
}
