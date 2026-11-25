import { formatDate, formatTime } from '../../formatters/date-format';

import { Delegate } from '../../helpers/delegate';
import type { ISubscription } from '../../helpers/isubscription';
import { type DeepPartial, merge } from '../../helpers/strict-type-checks';

import type { BarsRange } from '../bars-range';
import type { ChartModel } from '../chart-model';
import type { Coordinate } from '../coordinate';
import type { DataStore } from '../data-store';
import type { LocalizationOptions } from '../localization-options';
import { secondsToBusinessDay, type TimePointIndex, type TimeSecondsRange, type UTCTimestamp } from './time-data';

const enum Constants {
	MinBarSpacing = 0.5,
	// the maximum bar spacing is the width divided by this number
	MinVisibleBarsCount = 2,
	MaxCachedLabels = 500,
}

/** What the label of a tick mark shows. */
const enum LabelKind {
	Time,
	Seconds,
	Date,
	Year,
}

export interface TimeMark {
	coord: number;
	label: string;
}

export interface TimeScaleOptions {
	rightOffset: number;
	barSpacing: number;
	fixLeftEdge: boolean;
	lockVisibleTimeRangeOnResize: boolean;
	rightBarStaysOnScroll: boolean;
	borderVisible: boolean;
	borderColor: string;
	visible: boolean;
	timeVisible: boolean;
	secondsVisible: boolean;
}

/**
 * x of the center of the bar at a time index.
 * @param rightIndex - the base index plus the right offset
 */
export function barX(width: number, rightIndex: number, barSpacing: number, index: number): number {
	return width - (rightIndex - index + 0.5) * barSpacing;
}

/**
 * The smallest step that is not less than a number of bars. A step is a power of 2,
 * or 3 times a power of 2: 1, 2, 3, 4, 6, 8, 12, 16...
 */
function markStep(minBars: number): number {
	const step = 2 ** Math.max(0, Math.ceil(Math.log2(minBars)));
	return step >= 4 && step * 0.75 >= minBars ? step * 0.75 : step;
}

export class TimeScale {
	readonly #options: TimeScaleOptions;
	readonly #model: ChartModel;
	readonly #localizationOptions: LocalizationOptions;
	readonly #store: DataStore;

	#width: number = 0;
	/** Index of the last time point, or null before the first data. */
	/** Distance in bars from the last time point to the right edge. */
	#rightOffset: number;
	#barSpacing: number;
	/** True when the first time point cannot go right of the left edge (option `fixLeftEdge`). */
	#leftEdgeFixed: boolean = false;

	#visibleBars: BarsRange | null = null;
	#visibleBarsValid: boolean = false;
	readonly #visibleBarsChanged: Delegate = new Delegate();

	// state of a drag: x at the start, and the values at the start
	#scrollStart: number | null = null;
	#scaleStart: number | null = null;
	#barSpacingAtStart: number = 0;
	#rightOffsetAtStart: number = 0;

	/** The number of the last scroll animation. A step of an older animation does nothing. */
	#animation: number = 0;
	readonly #marks: TimeMark[] = [];
	#marksValid: boolean = false;
	// one date formatter for each label kind (slow to make, fast to use)
	readonly #labelFormatters: (Intl.DateTimeFormat | undefined)[] = [];
	// the text of the last labels, by time. It is valid for one step and one generation of the store.
	readonly #labelCache: Map<number, string> = new Map();
	#labelStep: number = 0;
	#labelGeneration: number = -1;

	public constructor(model: ChartModel, options: TimeScaleOptions, localizationOptions: LocalizationOptions) {
		this.#options = options;
		this.#localizationOptions = localizationOptions;
		this.#rightOffset = options.rightOffset;
		this.#barSpacing = options.barSpacing;
		this.#model = model;
		this.#store = model.dataStore();
	}

	public options(): Readonly<TimeScaleOptions> {
		return this.#options;
	}

	public applyOptions(options: DeepPartial<TimeScaleOptions>): void {
		merge(this.#options, options);

		this.#leftEdgeFixed &&= this.#options.fixLeftEdge;
		this.#fixLeftEdge();

		// the bar spacing first: the limits of the right offset depend on it
		if (options.barSpacing !== undefined) {
			this.setBarSpacing(options.barSpacing);
		}
		if (options.rightOffset !== undefined) {
			this.setRightOffset(options.rightOffset);
		}

		this.resetLabels();
	}

	/** Call when the locale or an option that changes the text of the labels changed. */
	public resetLabels(): void {
		this.#marksValid = false;
		this.#labelFormatters.length = 0;
		this.#labelCache.clear();
	}

	public isEmpty(): boolean {
		return this.#width === 0 || this.#store.length === 0;
	}

	public visibleBars(): BarsRange | null {
		if (!this.#visibleBarsValid) {
			this.#visibleBarsValid = true;
			this.#marksValid = false;

			const old = this.#visibleBars;
			let bars: BarsRange | null = null;
			if (!this.isEmpty()) {
				const last = Math.round(this.#rightOffset + this.baseIndex());
				const first = last - Math.ceil(this.#width / this.#barSpacing) + 1;
				bars = old !== null && old.first === first && old.last === last ? old : { first: first as TimePointIndex, last: last as TimePointIndex };
			}

			this.#visibleBars = bars;
			if (bars !== old) {
				this.#visibleBarsChanged.fire();
			}
		}

		return this.#visibleBars;
	}

	public width(): number {
		return this.#width;
	}

	public setWidth(width: number): void {
		const oldWidth = this.#width;
		if (!isFinite(width) || width <= 0 || oldWidth === width) {
			return;
		}

		if (this.#options.lockVisibleTimeRangeOnResize && oldWidth !== 0) {
			this.#setBarSpacing(this.#barSpacing * width / oldWidth);
		}

		const visibleBars = this.#leftEdgeFixed ? this.visibleBars() : null;
		if (visibleBars !== null && visibleBars.first <= 0) {
			// the left edge is at the first bar: keep the left edge in its position, not the right edge
			this.#rightOffset -= Math.round((oldWidth - width) / this.#barSpacing) + 1;
		}

		this.#width = width;
		this.#visibleBarsValid = false;

		// the limits of the bar spacing depend on the width, and the limits of the right offset on the bar spacing
		this.#setBarSpacing(this.#barSpacing);
		this.#correctOffset();
	}

	public indexToCoordinate(index: TimePointIndex): Coordinate {
		if (this.isEmpty()) {
			return 0 as Coordinate;
		}

		return barX(this.#width, this.baseIndex() + this.#rightOffset, this.#barSpacing, index) as Coordinate;
	}

	/** Time of a time point in UTC seconds, or null when there is no such time point. */
	public indexToTime(index: TimePointIndex): number | null {
		return index >= 0 && index < this.#store.length ? this.#store.times[index] : null;
	}

	public coordinateToIndex(x: Coordinate): TimePointIndex {
		return Math.ceil(this.#coordinateToFloatIndex(x)) as TimePointIndex;
	}

	public rightOffset(): number {
		return this.#rightOffset;
	}

	public setRightOffset(offset: number): void {
		this.#visibleBarsValid = false;
		this.#rightOffset = offset;
		this.#correctOffset();
		this.#changed();
	}

	public barSpacing(): number {
		return this.#barSpacing;
	}

	public setBarSpacing(barSpacing: number): void {
		this.#setBarSpacing(barSpacing);
		this.#correctOffset();
		this.#changed();
	}

	/**
	 * The visible tick marks. The array and its items are used again for each build.
	 * There is a mark at each time index that is a multiple of a step, thus the distance
	 * between marks is constant.
	 */
	public marks(): TimeMark[] | null {
		if (this.isEmpty()) {
			return null;
		}

		const visibleBars = this.visibleBars() as BarsRange;
		const labels = this.#marks;
		if (this.#marksValid) {
			return labels;
		}
		this.#marksValid = true;

		const store = this.#store;
		// two marks must be at least this number of bars apart, or their labels overlap
		const minBars = (this.#model.options().layout.fontSize + 4) * 4 / this.#barSpacing;
		let step = markStep(minBars);
		// a step of more than half a year: each label can have a year, and such a label is wider
		if (step < store.length && store.times[step] - store.times[0] > 183 * 86400) {
			step = markStep(minBars * 1.5);
		}

		// the text of a label depends on the mark before it, thus on the step
		if (step !== this.#labelStep || store.generation !== this.#labelGeneration) {
			this.#labelStep = step;
			this.#labelGeneration = store.generation;
			this.#labelCache.clear();
		}

		const last = Math.min(visibleBars.last, store.length - 1);
		let count = 0;
		for (let index = Math.max(0, Math.ceil(visibleBars.first / step) * step); index <= last; index += step) {
			if (count === labels.length) {
				labels.push({ coord: 0, label: '' });
			}
			const label = labels[count++];
			label.coord = this.indexToCoordinate(index as TimePointIndex);
			label.label = this.#formatLabel(index, step);
		}
		labels.length = count;

		return labels;
	}

	/** Stops the scroll animation that is in progress, if there is one. */
	public stopAnimation(): void {
		this.#animation++;
	}

	/** Call when all time points of the data store changed. */
	public reset(): void {
		this.stopAnimation();
		this.endDrag();
		this.#leftEdgeFixed = false;
		this.#dataChanged();
	}

	public restoreDefault(): void {
		this.setBarSpacing(this.#options.barSpacing);
		this.setRightOffset(this.#options.rightOffset);
	}

	/** The index of the last time point, or 0 with no data. The right offset is relative to it. */
	public baseIndex(): TimePointIndex {
		return Math.max(0, this.#store.length - 1) as TimePointIndex;
	}

	/**
	 * Zooms in or out, and keeps the time at `zoomPoint` in its position
	 * (if the option `rightBarStaysOnScroll` is off).
	 * @param scale - in 1/10 parts of the bar spacing. A negative value zooms out.
	 */
	public zoom(zoomPoint: Coordinate, scale: number): void {
		if (this.isEmpty() || scale === 0) {
			return;
		}

		zoomPoint = Math.max(1, Math.min(zoomPoint, this.#width)) as Coordinate;
		const indexAtZoomPoint = this.#coordinateToFloatIndex(zoomPoint);
		this.setBarSpacing(this.#barSpacing * (1 + scale / 10));

		if (!this.#options.rightBarStaysOnScroll) {
			this.setRightOffset(this.#rightOffset + indexAtZoomPoint - this.#coordinateToFloatIndex(zoomPoint));
		}
	}

	// ---- drag on the time axis (scale) and in the pane (scroll)

	public startScale(x: Coordinate): void {
		if (this.#scrollStart !== null) {
			this.endDrag();
		}
		if (this.#scaleStart === null && !this.isEmpty()) {
			this.#scaleStart = x;
			this.#barSpacingAtStart = this.#barSpacing;
		}
	}

	public scaleTo(x: Coordinate): void {
		const start = this.#scaleStart;
		const width = this.#width;
		if (start !== null && x < width && start < width) {
			this.setBarSpacing(this.#barSpacingAtStart * Math.min(width - x, width) / Math.min(width - start, width));
		}
	}

	public startScroll(x: Coordinate): void {
		if (this.#scrollStart === null && this.#scaleStart === null && !this.isEmpty()) {
			// the scroll of the user replaces a scroll animation
			this.stopAnimation();
			this.#scrollStart = x;
			this.#rightOffsetAtStart = this.#rightOffset;
		}
	}

	public scrollTo(x: Coordinate): void {
		if (this.#scrollStart !== null) {
			this.#rightOffset = this.#rightOffsetAtStart + (this.#scrollStart - x) / this.#barSpacing;
			this.#visibleBarsValid = false;
			this.#correctOffset();
			this.#changed();
		}
	}

	/** Scrolls by a number of pixels. A positive number moves the bars to the right. */
	public scrollBy(pixels: number): void {
		if (!this.isEmpty()) {
			this.setRightOffset(this.#rightOffset - pixels / this.#barSpacing);
		}
	}

	/** Ends a scale or a scroll. */
	public endDrag(): void {
		this.#scrollStart = null;
		this.#scaleStart = null;
	}

	/** @param duration - milliseconds */
	public scrollToOffsetAnimated(offset: number, duration: number): void {
		const animation = ++this.#animation;
		const source = this.#rightOffset;
		const start = Date.now();
		const step = (): void => {
			if (animation !== this.#animation) {
				return;
			}
			const progress = Math.min(1, (Date.now() - start) / duration);
			this.setRightOffset(source + (offset - source) * progress);
			if (progress < 1) {
				setTimeout(step, 20);
			}
		};

		step();
	}

	/** Call after one time point was added at the end of the data store. */
	public timePointAdded(): void {
		if (this.#rightOffset < 0) {
			// the user looks at history: keep the visible bars in place
			this.#rightOffset -= 1;
		}
		this.#dataChanged();
	}

	public visibleBarsChanged(): ISubscription {
		return this.#visibleBarsChanged;
	}

	/** Shows the time points `first` to `last`. */
	public setVisibleRange(first: number, last: number): void {
		this.#setBarSpacing(this.#width / (last - first + 1));
		this.setRightOffset(last - this.baseIndex());
	}

	public fitContent(): void {
		const count = this.#store.length;
		if (count !== 0) {
			this.setVisibleRange(0, count - 1 + this.#options.rightOffset);
		}
	}

	public setTimeRange(range: TimeSecondsRange): void {
		const store = this.#store;
		const count = store.length;
		if (count !== 0) {
			this.setVisibleRange(
				store.indexOfTime(Math.max(store.times[0], Math.min(range.from, range.to)), true) as number,
				store.indexOfTime(Math.min(store.times[count - 1], Math.max(range.from, range.to)), true) as number
			);
		}
	}

	/** Formats a time (UTC seconds) for the crosshair label. */
	public formatDateTime(time: number): string {
		const localization = this.#localizationOptions;
		if (localization.timeFormatter !== undefined) {
			return localization.timeFormatter(this.#store.businessDay ? secondsToBusinessDay(time) : time as UTCTimestamp);
		}

		const date = new Date(time * 1000);
		const text = formatDate(date, localization.dateFormat, localization.locale);
		return this.#options.timeVisible ? text + '   ' + formatTime(date, this.#options.secondsVisible) : text;
	}

	// ---- private

	/** The visible range changed: the price scales need a new autoscale, and the chart a new frame. */
	#changed(): void {
		this.#model.recalculateAllPanes();
		this.#model.lightUpdate();
	}

	#coordinateToFloatIndex(x: Coordinate): number {
		const index = this.baseIndex() + this.#rightOffset - (this.#width + 1 - x) / this.#barSpacing;
		// the rounding removes the error of the floating-point calculation
		return Math.round(index * 1000000) / 1000000;
	}

	#setBarSpacing(barSpacing: number): void {
		barSpacing = Math.max(barSpacing, Constants.MinBarSpacing);
		if (this.#width !== 0) {
			barSpacing = Math.min(barSpacing, this.#width / Constants.MinVisibleBarsCount);
		}

		if (barSpacing !== this.#barSpacing) {
			this.#barSpacing = barSpacing;
			this.#visibleBarsValid = false;
			this.#marksValid = false;
		}
	}

	/** Keeps the right offset in its limits: at least some bars stay visible. */
	#correctOffset(): void {
		const count = this.#store.length;
		const base = count - 1;
		const bars = this.#width / this.#barSpacing;
		const minVisible = Math.min(Constants.MinVisibleBarsCount, count);

		// no scroll into the future
		let offset = Math.min(this.#rightOffset, bars - minVisible);
		// no scroll into the past
		if (count !== 0) {
			offset = Math.max(offset, this.#leftEdgeFixed ? bars - 1 - base : minVisible - 1 - base);
		}

		if (offset !== this.#rightOffset) {
			this.#rightOffset = offset;
			this.#visibleBarsValid = false;
		}
	}

	/**
	 * The text of the mark at a time index: the date of the time point. The year shows
	 * only on the first mark of a year. With the option `timeVisible`, a mark on the
	 * same day as the mark before it shows the time.
	 */
	#formatLabel(index: number, step: number): string {
		const cache = this.#labelCache;
		const times = this.#store.times;
		const time = times[index];
		let text = cache.get(time);
		if (text === undefined) {
			const options = this.#options;
			// NaN for the first mark: it is a date with no year
			const previous = index < step ? NaN : times[index - step];
			let kind: LabelKind;
			if (options.timeVisible && Math.floor(time / 86400) === Math.floor(previous / 86400)) {
				kind = options.secondsVisible && (time % 60 !== 0 || previous % 60 !== 0) ? LabelKind.Seconds : LabelKind.Time;
			} else {
				kind = new Date(time * 1000).getUTCFullYear() !== new Date(previous * 1000).getUTCFullYear() && index >= step ? LabelKind.Year : LabelKind.Date;
			}

			let formatter = this.#labelFormatters[kind];
			if (formatter === undefined) {
				const timeFormat: Intl.DateTimeFormatOptions = { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit' };
				const date: Intl.DateTimeFormatOptions = { timeZone: 'UTC', day: 'numeric', month: 'short' };
				if (kind === LabelKind.Seconds) {
					timeFormat.second = '2-digit';
				}
				if (kind === LabelKind.Year) {
					date.year = 'numeric';
				}
				formatter = new Intl.DateTimeFormat(this.#localizationOptions.locale, kind < LabelKind.Date ? timeFormat : date);
				this.#labelFormatters[kind] = formatter;
			}

			if (cache.size >= Constants.MaxCachedLabels) {
				cache.clear();
			}
			text = formatter.format(time * 1000);
			cache.set(time, text);
		}

		return text;
	}

	#dataChanged(): void {
		this.#visibleBarsValid = false;
		this.#correctOffset();
		this.#fixLeftEdge();
	}

	#fixLeftEdge(): void {
		const visibleBars = this.visibleBars();
		if (!this.#options.fixLeftEdge || this.#leftEdgeFixed || visibleBars === null) {
			return;
		}

		this.#leftEdgeFixed = true;
		if (visibleBars.first < 0) {
			this.setRightOffset(this.#rightOffset - visibleBars.first - 1);
		}
	}
}
