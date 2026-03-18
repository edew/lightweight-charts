import { ensureNotNull } from '../helpers/assertions';
import type { IDestroyable } from '../helpers/idestroyable';
import { clone, type DeepPartial } from '../helpers/strict-type-checks';

import { ChartModel } from '../model/chart-model';
import type { TimePoint, TimePointIndex, TimePointsRange } from '../model/time-scale/time-data';
import { TimeScale, type TimeScaleOptions } from '../model/time-scale/time-scale';

import type { Time } from './data-consumer';
import { convertTime } from './data-layer';
import type { ITimeScaleApi, TimeRange } from './itime-scale-api';

const enum Constants {
	AnimationDurationMs = 1000,
}

export class TimeScaleApi implements ITimeScaleApi, IDestroyable {
	#model: ChartModel;

	public constructor(model: ChartModel) {
		this.#model = model;
	}

	public destroy(): void {
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

		this.#timeScale().scrollToOffsetAnimated(position, Constants.AnimationDurationMs);
	}

	public scrollToRealTime(): void {
		this.#timeScale().scrollToRealTime();
	}

	public getVisibleRange(): TimeRange | null {
		const visibleBars = this.#timeScale().visibleBars();
		if (visibleBars === null) {
			return null;
		}

		const points = this.#model.timeScale().points();
		const firstIndex = ensureNotNull(points.firstIndex());
		const lastIndex = ensureNotNull(points.lastIndex());

		return {
			from: timePointToTime(ensureNotNull(points.valueAt(Math.max(firstIndex, visibleBars.firstBar()) as TimePointIndex))),
			to: timePointToTime(ensureNotNull(points.valueAt(Math.min(lastIndex, visibleBars.lastBar()) as TimePointIndex))),
		};
	}

	public setVisibleRange(range: TimeRange): void {
		const convertedRange: TimePointsRange = {
			from: convertTime(range.from),
			to: convertTime(range.to),
		};
		this.#model.setTargetTimeRange(convertedRange);
	}

	public resetTimeScale(): void {
		this.#model.resetTimeScale();
	}

	public fitContent(): void {
		this.#model.fitContent();
	}

	public applyOptions(options: DeepPartial<TimeScaleOptions>): void {
		this.#timeScale().applyOptions(options);
	}

	public options(): Readonly<TimeScaleOptions> {
		return clone(this.#timeScale().options());
	}

	#timeScale(): TimeScale {
		return this.#model.timeScale();
	}
}

function timePointToTime(point: TimePoint): Time {
	return point.businessDay || point.timestamp;
}
