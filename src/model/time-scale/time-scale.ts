import { formatDate, formatTime } from '../../formatters/date-format';

import { Delegate } from '../../helpers/delegate';
import type { ISubscription } from '../../helpers/isubscription';
import { type DeepPartial, merge } from '../../helpers/strict-type-checks';

import type { BarsRange } from '../bars-range';
import type { ChartModel } from '../chart-model';
import type { Coordinate } from '../coordinate';
import type { DataStore } from '../data-store';
import type { LocalizationOptions } from '../localization-options';
import { TickMarks } from './tick-marks';
import { secondsToBusinessDay, type TimePointIndex, type TimeSecondsRange, type UTCTimestamp } from './time-data';

const enum Constants {
	DefaultAnimationDuration = 400,
	MinBarSpacing = 0.5,
	// the maximum bar spacing is the width divided by this number
	MinVisibleBarsCount = 2,
	MaxCachedLabels = 500,
}

/** Tick-mark weights: a time point with a weight below `Day` is in the same day as the time point before it, and so on. */
const enum MarkSpanBorder {
	Minute = 20,
	Hour = 30,
	Day = 40,
	Week = 50,
	Month = 60,
	Year = 70,
}

export interface TimeMark {
	coord: number;
	label: string;
	span: number;
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

export class TimeScale {
	readonly #options: TimeScaleOptions;
	readonly #model: ChartModel;
	readonly #localizationOptions: LocalizationOptions;
	readonly #store: DataStore;

	#width: number = 0;
	/** Index of the last time point, or null before the first data. */
	#baseIndex: TimePointIndex | null = null;
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

	readonly #tickMarks: TickMarks = new TickMarks();
	readonly #marks: TimeMark[] = [];
	#marksValid: boolean = false;
	// one date formatter for each weight (slow to make, fast to use), and the text of the last labels
	readonly #labelFormatters: Map<number, Intl.DateTimeFormat> = new Map();
	readonly #labelCache: Map<number, string> = new Map();

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
		this.#labelFormatters.clear();
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
			if (old !== null && bars !== old) {
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
		if (this.isEmpty() || !Number.isInteger(index)) {
			return 0 as Coordinate;
		}

		const deltaFromRight = this.baseIndex() + this.#rightOffset - index;
		return this.#width - (deltaFromRight + 0.5) * this.#barSpacing as Coordinate;
	}

	/** Time of a time point in UTC seconds, or null when there is no such time point. */
	public indexToTime(index: TimePointIndex): number | null {
		return Number.isInteger(index) && index >= 0 && index < this.#store.length ? this.#store.times[index] : null;
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

	/** The visible tick marks. The array and its items are used again for each build. */
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

		const maxLabelWidth = (this.#model.options().layout.fontSize + 4) * 5;
		const store = this.#store;
		const marks = this.#tickMarks.build(store.spans, store.length, store.generation, this.#barSpacing, maxLabelWidth);
		const indexes = marks.indexes;

		// first accepted mark that is not left of the visible range
		let position = 0;
		let end = marks.count;
		while (position < end) {
			const mid = (position + end) >> 1;
			if (indexes[mid] < visibleBars.first) {
				position = mid + 1;
			} else {
				end = mid;
			}
		}

		let count = 0;
		for (; position < marks.count && indexes[position] <= visibleBars.last; position++) {
			const index = indexes[position] as TimePointIndex;
			const span = store.spans[index];
			if (count === labels.length) {
				labels.push({ coord: 0, label: '', span: 0 });
			}
			const label = labels[count++];
			label.coord = this.indexToCoordinate(index);
			label.label = this.#formatLabel(store.times[index], span);
			label.span = span;
		}
		labels.length = count;

		return labels;
	}

	/** Call when all time points of the data store changed. */
	public reset(): void {
		this.#visibleBarsValid = false;
		this.endDrag();
		this.#tickMarks.reset();
		this.#leftEdgeFixed = false;
	}

	public restoreDefault(): void {
		this.setBarSpacing(this.#options.barSpacing);
		this.setRightOffset(this.#options.rightOffset);
	}

	public baseIndex(): TimePointIndex {
		return this.#baseIndex ?? 0 as TimePointIndex;
	}

	public setBaseIndex(baseIndex: TimePointIndex): void {
		this.#visibleBarsValid = false;
		this.#baseIndex = baseIndex;
		this.#correctOffset();
		this.#fixLeftEdge();
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

	public scrollToRealTime(): void {
		this.scrollToOffsetAnimated(this.#options.rightOffset);
	}

	public scrollToOffsetAnimated(offset: number, duration: number = Constants.DefaultAnimationDuration): void {
		const source = this.#rightOffset;
		const start = Date.now();
		const step = (): void => {
			const progress = Math.min(1, (Date.now() - start) / duration);
			this.setRightOffset(source + (offset - source) * progress);
			if (progress < 1) {
				setTimeout(step, 20);
			}
		};

		step();
	}

	/**
	 * Call after the time points of the data store changed.
	 * @param oldSize - number of time points before the change
	 */
	public update(oldSize: number): void {
		this.#visibleBarsValid = false;
		if (this.#rightOffset < 0 && this.#store.length === oldSize + 1) {
			// one new time point while the user looks at history: keep the visible bars in place
			this.#rightOffset -= 1;
		}
		this.#correctOffset();
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
				store.indexOfTime(Math.max(store.times[0], range.from), true) as number,
				store.indexOfTime(Math.min(store.times[count - 1], range.to), true) as number
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
		const base = this.#baseIndex;
		const bars = this.#width / this.#barSpacing;
		const minVisible = Math.min(Constants.MinVisibleBarsCount, count);

		// no scroll into the future
		let offset = Math.min(this.#rightOffset, bars - minVisible);
		// no scroll into the past
		if (count !== 0 && base !== null) {
			offset = Math.max(offset, this.#leftEdgeFixed ? bars - 1 - base : minVisible - 1 - base);
		}

		if (offset !== this.#rightOffset) {
			this.#rightOffset = offset;
			this.#visibleBarsValid = false;
		}
	}

	#formatLabel(time: number, span: number): string {
		const cache = this.#labelCache;
		// a weight is less than 256
		const key = time * 256 + span;
		let text = cache.get(key);
		if (text === undefined) {
			let formatter = this.#labelFormatters.get(span);
			if (formatter === undefined) {
				formatter = new Intl.DateTimeFormat(this.#localizationOptions.locale, this.#labelFormatOptions(span));
				this.#labelFormatters.set(span, formatter);
			}

			if (cache.size >= Constants.MaxCachedLabels) {
				cache.clear();
			}
			text = formatter.format(time * 1000);
			cache.set(key, text);
		}

		return text;
	}

	/** Which part of the date a tick mark with the given weight shows. */
	#labelFormatOptions(span: number): Intl.DateTimeFormatOptions {
		const formatOptions: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };

		if (span < MarkSpanBorder.Day && this.#options.timeVisible) {
			formatOptions.hour12 = false;
			formatOptions.hour = '2-digit';
			formatOptions.minute = '2-digit';
			if (span < MarkSpanBorder.Minute && this.#options.secondsVisible) {
				formatOptions.second = '2-digit';
			}
		} else if (span < MarkSpanBorder.Month) {
			formatOptions.day = 'numeric';
		} else if (span < MarkSpanBorder.Year) {
			formatOptions.month = 'short';
		} else {
			formatOptions.year = 'numeric';
		}

		return formatOptions;
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
