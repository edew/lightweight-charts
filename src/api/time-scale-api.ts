import type { IDestroyable } from '../helpers/idestroyable';
import { clone, type DeepPartial } from '../helpers/strict-type-checks';

import { ChartModel } from '../model/chart-model';
import { TimeScale, type TimeScaleOptions } from '../model/time-scale/time-scale';

import { secondsToTime, timeToSeconds } from './data-convert';
import type { ITimeScaleApi, TimeRange } from './itime-scale-api';

/** Milliseconds of the scroll animations. The interface documents these values. */
const enum AnimationDuration {
	ToPosition = 1000,
	ToRealTime = 400,
}

export class TimeScaleApi implements ITimeScaleApi, IDestroyable {
	#model: ChartModel;

	public constructor(model: ChartModel) {
		this.#model = model;
	}

	public destroy(): void {
		this.#timeScale().stopAnimation();
		(this.#model as unknown as null) = null;
	}

	public scrollPosition(): number {
		return this.#timeScale().rightOffset();
	}

	public scrollToPosition(position: number, animated: boolean): void {
		if (!animated) {
			this.#timeScale().setRightOffset(position);
			return;
		}

		this.#timeScale().scrollToOffsetAnimated(position, AnimationDuration.ToPosition);
	}

	public scrollToRealTime(): void {
		const timeScale = this.#timeScale();
		timeScale.scrollToOffsetAnimated(timeScale.options().rightOffset, AnimationDuration.ToRealTime);
	}

	public getVisibleRange(): TimeRange | null {
		const visibleBars = this.#timeScale().visibleBars();
		if (visibleBars === null) {
			return null;
		}

		const store = this.#model.dataStore();
		const businessDay = store.businessDay === true;
		return {
			from: secondsToTime(store.times[Math.max(0, visibleBars.first)], businessDay),
			to: secondsToTime(store.times[Math.min(store.length - 1, visibleBars.last)], businessDay),
		};
	}

	public setVisibleRange(range: TimeRange): void {
		this.#model.setTargetTimeRange({
			from: timeToSeconds(range.from),
			to: timeToSeconds(range.to),
		});
	}

	public resetTimeScale(): void {
		this.#timeScale().restoreDefault();
	}

	public fitContent(): void {
		this.#model.fitContent();
	}

	public applyOptions(options: DeepPartial<TimeScaleOptions>): void {
		// through the model, so that the chart gets a new layout (the axis can become visible)
		this.#model.applyOptions({ timeScale: options });
	}

	public options(): Readonly<TimeScaleOptions> {
		return clone(this.#timeScale().options());
	}

	#timeScale(): TimeScale {
		return this.#model.timeScale();
	}
}
