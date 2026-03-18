import { DateFormatter } from '../../formatters/date-formatter';
import { DateTimeFormatter } from '../../formatters/date-time-formatter';

import { ensureNotNull } from '../../helpers/assertions';
import { Delegate } from '../../helpers/delegate';
import type { ISubscription } from '../../helpers/isubscription';
import { clamp } from '../../helpers/mathex';
import { type DeepPartial, isInteger, merge } from '../../helpers/strict-type-checks';

import { BarsRange } from '../bars-range';
import { ChartModel } from '../chart-model';
import type { Coordinate } from '../coordinate';
import { FormattedLabelsCache } from './formatted-labels-cache';
import type { LocalizationOptions } from '../localization-options';
import { TickMarks } from './tick-marks';
import type { SeriesItemsIndexesRange, TickMark, TimedValue, TimePoint, TimePointIndex, TimePointsRange, UTCTimestamp } from './time-data';
import { TimePoints } from './time-points';

const enum Constants {
	DefaultAnimationDuration = 400,
	MinBarSpacing = 0.5,
	// make sure that this (1 / MinVisibleBarsCount) >= coeff in max bar spacing
	MinVisibleBarsCount = 2,
}

export const enum MarkSpanBorder {
	Minute = 20,
	Hour = 30,
	Day = 40,
	Week = 50,
	Month = 60,
	Year = 70,
}

interface TransitionState {
	barSpacing: number;
	rightOffset: number;
}

export interface TimeMark {
	coord: number;
	label: string;
	span: number;
	major: boolean;
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

	#dateTimeFormatter!: DateFormatter | DateTimeFormatter;

	#width: number = 0;
	#baseIndexOrNull: TimePointIndex | null = null;
	#rightOffset: number;
	#points: TimePoints = new TimePoints();
	#barSpacing: number;
	#scrollStartPoint: Coordinate | null = null;
	#scaleStartPoint: Coordinate | null = null;
	readonly #tickMarks: TickMarks = new TickMarks();
	#formattedBySpan: Map<number, FormattedLabelsCache> = new Map();
	#visibleBars: BarsRange | null = null;
	#visibleBarsInvalidated: boolean = true;
	readonly #visibleBarsChanged: Delegate = new Delegate();
	readonly #optionsApplied: Delegate = new Delegate();
	#leftEdgeIndex: TimePointIndex | null = null;
	#commonTransitionStartState: TransitionState | null = null;
	#timeMarksCache: TimeMark[] | null = null;

	#labels: TimeMark[] = [];

	public constructor(model: ChartModel, options: TimeScaleOptions, localizationOptions: LocalizationOptions) {
		this.#options = options;
		this.#localizationOptions = localizationOptions;
		this.#rightOffset = options.rightOffset;
		this.#barSpacing = options.barSpacing;
		this.#model = model;

		this.#updateDateTimeFormatter();
	}

	public options(): Readonly<TimeScaleOptions> {
		return this.#options;
	}

	public applyLocalizationOptions(localizationOptions: DeepPartial<LocalizationOptions>): void {
		merge(this.#localizationOptions, localizationOptions);

		this.#invalidateTickMarks();
		this.#updateDateTimeFormatter();
	}

	public applyOptions(options: DeepPartial<TimeScaleOptions>, localizationOptions?: DeepPartial<LocalizationOptions>): void {
		merge(this.#options, options);

		if (this.#options.fixLeftEdge) {
			this.#fixLeftEdge();
		} else {
			this.#leftEdgeIndex = null;
		}

		// note that bar spacing should be applied before right offset
		// because right offset depends on bar spacing
		if (options.barSpacing !== undefined) {
			this.setBarSpacing(options.barSpacing);
		}

		if (options.rightOffset !== undefined) {
			this.setRightOffset(options.rightOffset);
		}

		this.#invalidateTickMarks();
		this.#updateDateTimeFormatter();

		this.#optionsApplied.fire();
	}

	public isEmpty(): boolean {
		return this.#width === 0 || this.#points.size() === 0;
	}

	public visibleBars(): BarsRange | null {
		if (this.#visibleBarsInvalidated) {
			this.#visibleBarsInvalidated = false;
			this.#updateVisibleBars();
		}

		return this.#visibleBars;
	}

	public tickMarks(): TickMarks {
		return this.#tickMarks;
	}
	public points(): TimePoints {
		return this.#points;
	}
	public width(): number {
		return this.#width;
	}

	public setWidth(width: number): void {
		if (!isFinite(width) || width <= 0) {
			return;
		}

		if (this.#width === width) {
			return;
		}

		if (this.#options.lockVisibleTimeRangeOnResize && this.#width) {
			// recalculate bar spacing
			const newBarSpacing = this.#barSpacing * width / this.#width;
			this.#setBarSpacing(newBarSpacing);
		}

		// if time scale is scrolled to the end of data and we have fixed right edge
		// keep left edge instead of right
		// we need it to avoid "shaking" if the last bar visibility affects time scale width
		if (this.#leftEdgeIndex !== null) {
			const firstVisibleBar = ensureNotNull(this.visibleBars()).firstBar();
			// firstVisibleBar could be less than this.#leftEdgeIndex
			// since index is a center of bar
			if (firstVisibleBar <= this.#leftEdgeIndex) {
				const delta = this.#width - width;
				// reduce  _rightOffset means move right
				// we could move more than required - this will be fixed by _correctOffset()
				this.#rightOffset -= Math.round(delta / this.#barSpacing) + 1;
			}
		}

		this.#width = width;
		this.#visibleBarsInvalidated = true;

		// updating bar spacing should be first because right offset depends on it
		this.#correctBarSpacing();
		this.#correctOffset();
	}

	public indexToCoordinate(index: TimePointIndex): Coordinate {
		if (this.isEmpty() || !isInteger(index)) {
			return 0 as Coordinate;
		}

		const baseIndex = this.baseIndex();
		const deltaFromRight = baseIndex + this.#rightOffset - index;
		const coordinate = this.#width - (deltaFromRight + 0.5) * this.#barSpacing;
		return coordinate as Coordinate;
	}

	public indexesToCoordinates<T extends TimedValue>(points: T[], visibleRange?: SeriesItemsIndexesRange): void {
		const baseIndex = this.baseIndex();
		const indexFrom = (visibleRange === undefined) ? 0 : visibleRange.from;
		const indexTo = (visibleRange === undefined) ? points.length : visibleRange.to;

		for (let i = indexFrom; i < indexTo; i++) {
			const index = points[i].time;
			const deltaFromRight = baseIndex + this.#rightOffset - index;
			const coordinate = this.#width - (deltaFromRight + 0.5) * this.#barSpacing;
			points[i].x = coordinate as Coordinate;
		}
	}

	public indexToUserTime(index: TimePointIndex): TimePoint | null {
		return this.#tickMarks.indexToTime(index);
	}

	public coordinateToIndex(x: Coordinate): TimePointIndex {
		return Math.ceil(this.#coordinateToFloatIndex(x)) as TimePointIndex;
	}

	public setRightOffset(offset: number): void {
		this.#visibleBarsInvalidated = true;
		this.#rightOffset = offset;
		this.#correctOffset();
		this.#model.recalculateAllPanes();
		this.#model.lightUpdate();
	}

	public barSpacing(): number {
		return this.#barSpacing;
	}

	public setBarSpacing(newBarSpacing: number): void {
		this.#setBarSpacing(newBarSpacing);

		// do not allow scroll out of visible bars
		this.#correctOffset();

		this.#model.recalculateAllPanes();
		this.#model.lightUpdate();
	}

	public rightOffset(): number {
		return this.#rightOffset;
	}

	public marks(): TimeMark[] | null {
		if (this.isEmpty()) {
			return null;
		}

		if (this.#timeMarksCache !== null) {
			return this.#timeMarksCache;
		}

		const spacing = this.#barSpacing;
		const fontSize = this.#model.options().layout.fontSize;

		const maxLabelWidth = (fontSize + 4) * 5;
		const indexPerLabel = Math.round(maxLabelWidth / spacing);

		const visibleBars = ensureNotNull(this.visibleBars());

		const firstBar = Math.max(visibleBars.firstBar(), visibleBars.firstBar() - indexPerLabel);
		const lastBar = Math.max(visibleBars.lastBar(), visibleBars.lastBar() - indexPerLabel);

		const items = this.#tickMarks.build(spacing, maxLabelWidth);

		let targetIndex = 0;
		for (const tm of items) {
			if (!(firstBar <= tm.index && tm.index <= lastBar)) {
				continue;
			}

			const time = this.#tickMarks.indexToTime(tm.index);
			if (time === null) {
				continue;
			}

			if (targetIndex < this.#labels.length) {
				const label = this.#labels[targetIndex];
				label.coord = this.indexToCoordinate(tm.index);
				label.label = this.#formatLabel(time, tm.span);
				label.span = tm.span;
				label.major = false;
			} else {
				this.#labels.push({
					coord: this.indexToCoordinate(tm.index),
					label: this.#formatLabel(time, tm.span),
					span: tm.span,
					major: false,
					// major: tm.label >= TimeConstants.DaySpan ? 1 : 0, // ??? there is no label in tick-marks.ts
				});
			}
			targetIndex++;
		}
		this.#labels.length = targetIndex;

		this.#timeMarksCache = this.#labels;

		return this.#labels;
	}

	public reset(): void {
		this.#visibleBarsInvalidated = true;
		this.#points = new TimePoints();
		this.#scrollStartPoint = null;
		this.#scaleStartPoint = null;
		this.#clearCommonTransitionsStartState();
		this.#tickMarks.reset();
		this.#leftEdgeIndex = null;
	}

	public restoreDefault(): void {
		this.#visibleBarsInvalidated = true;

		this.setBarSpacing(this.#options.barSpacing);
		this.setRightOffset(this.#options.rightOffset);
	}

	public fixLeftEdge(): boolean {
		return this.#options.fixLeftEdge;
	}

	public setBaseIndex(baseIndex: TimePointIndex): void {
		this.#visibleBarsInvalidated = true;
		this.#baseIndexOrNull = baseIndex;
		this.#correctOffset();

		this.#fixLeftEdge();
	}

	/**
	 * Zoom in/out the scale around a `zoomPoint` on `scale` value.
	 * @param zoomPoint - X coordinate of the point to apply the zoom.
	 *   If `rightBarStaysOnScroll` option is disabled, then will be used to restore right offset.
	 * @param scale - Zoom value (in 1/10 parts of current bar spacing).
	 *   Negative value means zoom out, positive - zoom in.
	 */
	public zoom(zoomPoint: Coordinate, scale: number): void {
		const floatIndexAtZoomPoint = this.#coordinateToFloatIndex(zoomPoint);

		const barSpacing = this.barSpacing();
		const newBarSpacing = barSpacing + scale * (barSpacing / 10);

		// zoom in/out bar spacing
		this.setBarSpacing(newBarSpacing);

		if (!this.#options.rightBarStaysOnScroll) {
			// and then correct right offset to move index under zoomPoint back to its coordinate
			this.setRightOffset(this.rightOffset() + (floatIndexAtZoomPoint - this.#coordinateToFloatIndex(zoomPoint)));
		}
	}

	public startScale(x: Coordinate): void {
		if (this.#scrollStartPoint) {
			this.endScroll();
		}

		if (this.#scaleStartPoint !== null || this.#commonTransitionStartState !== null) {
			return;
		}

		if (this.isEmpty()) {
			return;
		}

		this.#scaleStartPoint = x;
		this.#saveCommonTransitionsStartState();
	}

	public scaleTo(x: Coordinate): void {
		if (this.#commonTransitionStartState === null) {
			return;
		}

		const startLengthFromRight = clamp(this.#width - x, 0, this.#width);
		const currentLengthFromRight = clamp(this.#width - ensureNotNull(this.#scaleStartPoint), 0, this.#width);
		if (startLengthFromRight === 0 || currentLengthFromRight === 0) {
			return;
		}

		this.setBarSpacing(
			this.#commonTransitionStartState.barSpacing * startLengthFromRight / currentLengthFromRight
		);
	}

	public endScale(): void {
		if (this.#scaleStartPoint === null) {
			return;
		}

		this.#scaleStartPoint = null;
		this.#clearCommonTransitionsStartState();
	}

	public startScroll(x: Coordinate): void {
		if (this.#scrollStartPoint !== null || this.#commonTransitionStartState !== null) {
			return;
		}

		if (this.isEmpty()) {
			return;
		}

		this.#scrollStartPoint = x;
		this.#saveCommonTransitionsStartState();
	}

	public scrollTo(x: Coordinate): void {
		this.#visibleBarsInvalidated = true;
		if (this.#scrollStartPoint === null) {
			return;
		}

		const shiftInLogical = (this.#scrollStartPoint - x) / this.barSpacing();
		this.#rightOffset = ensureNotNull(this.#commonTransitionStartState).rightOffset + shiftInLogical;
		this.#visibleBarsInvalidated = true;

		// do not allow scroll out of visible bars
		this.#correctOffset();
	}

	public endScroll(): void {
		if (this.#scrollStartPoint === null) {
			return;
		}

		this.#scrollStartPoint = null;
		this.#clearCommonTransitionsStartState();
	}

	public scrollToRealTime(): void {
		this.scrollToOffsetAnimated(this.#options.rightOffset);
	}

	public scrollToOffsetAnimated(offset: number, animationDuration: number = Constants.DefaultAnimationDuration): void {
		if (!isFinite(offset)) {
			throw new RangeError('offset is required and must be finite number');
		}

		if (!isFinite(animationDuration) || animationDuration <= 0) {
			throw new RangeError('animationDuration (optional) must be finite positive number');
		}

		const source = this.#rightOffset;
		const animationStart = new Date().getTime();
		const animationFn = () => {
			const animationProgress = (new Date().getTime() - animationStart) / animationDuration;
			const finishAnimation = animationProgress >= 1;
			const rightOffset = finishAnimation ? offset : source + (offset - source) * animationProgress;
			this.setRightOffset(rightOffset);
			if (!finishAnimation) {
				setTimeout(animationFn, 20);
			}
		};

		animationFn();
	}

	public update(index: TimePointIndex, values: TimePoint[], marks: TickMark[]): void {
		this.#visibleBarsInvalidated = true;
		if (values.length > 0) {
			// we have some time points to merge
			const oldSize = this.#points.size();
			this.#points.merge(index, values);
			if (this.#rightOffset < 0 && (this.#points.size() === oldSize + 1)) {
				this.#rightOffset -= 1;
				this.#visibleBarsInvalidated = true;
			}
		}
		this.#tickMarks.merge(marks);
		this.#correctOffset();
	}

	public visibleBarsChanged(): ISubscription {
		return this.#visibleBarsChanged;
	}

	public optionsApplied(): ISubscription {
		return this.#optionsApplied;
	}

	public baseIndex(): TimePointIndex {
		// null is used to known that baseIndex is not set yet
		// so in methods which should known whether it is set or not
		// we should check field `_baseIndexOrNull` instead of getter `baseIndex()`
		// see minRightOffset for example
		return this.#baseIndexOrNull || 0 as TimePointIndex;
	}

	public setVisibleRange(range: BarsRange): void {
		const length = range.count();
		this.#setBarSpacing(this.#width / length);
		this.#rightOffset = range.lastBar() - this.baseIndex();
		this.#correctOffset();
		this.#visibleBarsInvalidated = true;
		this.#model.recalculateAllPanes();
		this.#model.lightUpdate();
	}

	public fitContent(): void {
		const first = this.#points.firstIndex();
		const last = this.#points.lastIndex();
		if (first === null || last === null) {
			return;
		}

		this.setVisibleRange(new BarsRange(first, last + this.#options.rightOffset as TimePointIndex));
	}

	public setTimePointsRange(range: TimePointsRange): void {
		const points = this.points();
		const firstIndex = points.firstIndex();
		const lastIndex = points.lastIndex();

		if (firstIndex === null || lastIndex === null) {
			return;
		}

		const firstPoint = ensureNotNull(points.valueAt(firstIndex)).timestamp;
		const lastPoint = ensureNotNull(points.valueAt(lastIndex)).timestamp;

		const barRange = new BarsRange(
			ensureNotNull(points.indexOf(Math.max(firstPoint, range.from.timestamp) as UTCTimestamp, true)),
			ensureNotNull(points.indexOf(Math.min(lastPoint, range.to.timestamp) as UTCTimestamp, true))
		);
		this.setVisibleRange(barRange);
	}

	public formatDateTime(time: TimePoint): string {
		if (this.#localizationOptions.timeFormatter !== undefined) {
			return this.#localizationOptions.timeFormatter(time.businessDay || time.timestamp);
		}

		return this.#dateTimeFormatter.format(new Date(time.timestamp * 1000));
	}

	#rightOffsetForCoordinate(x: Coordinate): number {
		return (this.#width + 1 - x) / this.#barSpacing;
	}

	#coordinateToFloatIndex(x: Coordinate): number {
		const deltaFromRight = this.#rightOffsetForCoordinate(x);
		const baseIndex = this.baseIndex();
		const index = baseIndex + this.#rightOffset - deltaFromRight;

		// JavaScript uses very strange rounding
		// we need rounding to avoid problems with calculation errors
		return Math.round(index * 1000000) / 1000000;
	}

	#setBarSpacing(newBarSpacing: number): void {
		const oldBarSpacing = this.#barSpacing;
		this.#barSpacing = newBarSpacing;
		this.#correctBarSpacing();

		// this.#barSpacing might be changed in _correctBarSpacing
		if (oldBarSpacing !== this.#barSpacing) {
			this.#visibleBarsInvalidated = true;
			this.#resetTimeMarksCache();
		}
	}

	#updateVisibleBars(): void {
		if (this.isEmpty()) {
			this.#setVisibleBars(null);
			return;
		}

		const baseIndex = this.baseIndex();
		const newBarsLength = Math.ceil(this.#width / this.#barSpacing) - 1;
		const rightIndex = Math.round(this.#rightOffset + baseIndex) as TimePointIndex;
		const leftIndex = rightIndex - newBarsLength as TimePointIndex;

		this.#setVisibleBars(new BarsRange(leftIndex, rightIndex));
	}

	#correctBarSpacing(): void {
		if (this.#barSpacing < Constants.MinBarSpacing) {
			this.#barSpacing = Constants.MinBarSpacing;
			this.#visibleBarsInvalidated = true;
		}

		if (this.#width !== 0) {
			// make sure that this (1 / Constants.MinVisibleBarsCount) >= coeff in max bar spacing (it's 0.5 here)
			const maxBarSpacing = this.#width * 0.5;
			if (this.#barSpacing > maxBarSpacing) {
				this.#barSpacing = maxBarSpacing;
				this.#visibleBarsInvalidated = true;
			}
		}
	}

	#correctOffset(): void {
		// block scrolling of to future
		const maxRightOffset = this.#maxRightOffset();
		if (this.#rightOffset > maxRightOffset) {
			this.#rightOffset = maxRightOffset;
			this.#visibleBarsInvalidated = true;
		}

		// block scrolling of to past
		const minRightOffset = this.#minRightOffset();

		if (minRightOffset !== null && this.#rightOffset < minRightOffset) {
			this.#rightOffset = minRightOffset;
			this.#visibleBarsInvalidated = true;
		}
	}

	#minRightOffset(): number | null {
		const firstIndex = this.#points.firstIndex();
		const baseIndex = this.#baseIndexOrNull;
		if (firstIndex === null || baseIndex === null) {
			return null;
		}

		if (this.#leftEdgeIndex !== null) {
			const barsEstimation = this.#width / this.#barSpacing;
			return this.#leftEdgeIndex - baseIndex + barsEstimation - 1;
		}

		return firstIndex - baseIndex - 1 + Math.min(Constants.MinVisibleBarsCount, this.#points.size());
	}

	#maxRightOffset(): number {
		return (this.#width / this.#barSpacing) - Math.min(Constants.MinVisibleBarsCount, this.#points.size());
	}

	#saveCommonTransitionsStartState(): void {
		this.#commonTransitionStartState = {
			barSpacing: this.barSpacing(),
			rightOffset: this.rightOffset(),
		};
	}

	#clearCommonTransitionsStartState(): void {
		this.#commonTransitionStartState = null;
	}

	#formatLabel(time: TimePoint, span: number): string {
		let formatter = this.#formattedBySpan.get(span);
		if (formatter === undefined) {
			formatter = new FormattedLabelsCache((date: Date) => {
				return this.#formatLabelImpl(date, span);
			});

			this.#formattedBySpan.set(span, formatter);
		}

		if (time.businessDay === undefined) {
			return formatter.format(new Date(time.timestamp * 1000));
		} else {
			return formatter.format(new Date(Date.UTC(time.businessDay.year, time.businessDay.month - 1, time.businessDay.day)));
		}
	}

	#formatLabelImpl(d: Date, span: number): string {
		const formatOptions: Intl.DateTimeFormatOptions = {};

		const timeVisible = this.#options.timeVisible;
		if (span < MarkSpanBorder.Minute && timeVisible) {
			formatOptions.hour12 = false;
			formatOptions.hour = '2-digit';
			formatOptions.minute = '2-digit';
			if (this.#options.secondsVisible) {
				formatOptions.second = '2-digit';
			}
		} else if (span < MarkSpanBorder.Day && timeVisible) {
			formatOptions.hour12 = false;
			formatOptions.hour = '2-digit';
			formatOptions.minute = '2-digit';
		} else if (span < MarkSpanBorder.Week) {
			formatOptions.day = 'numeric';
		} else if (span < MarkSpanBorder.Month) {
			formatOptions.day = 'numeric';
		} else if (span < MarkSpanBorder.Year) {
			formatOptions.month = 'short';
		} else {
			formatOptions.year = 'numeric';
		}

		// from given date we should use only as UTC date or timestamp
		// but to format as locale date we can convert UTC date to local date
		const localDateFromUtc = new Date(
			d.getUTCFullYear(),
			d.getUTCMonth(),
			d.getUTCDate(),
			d.getUTCHours(),
			d.getUTCMinutes(),
			d.getUTCSeconds(),
			d.getUTCMilliseconds()
		);

		return localDateFromUtc.toLocaleString(this.#localizationOptions.locale, formatOptions);
	}

	#setVisibleBars(visibleBars: BarsRange | null): void {
		if (visibleBars === null && this.#visibleBars === null) {
			return;
		}

		const oldVisibleBars = this.#visibleBars;
		this.#visibleBars = visibleBars;

		if (this.#visibleBars === null || oldVisibleBars !== null && !this.#visibleBars.equals(oldVisibleBars)) {
			this.#visibleBarsChanged.fire();
		}

		// TODO: reset only coords in case when this.#visibleBars has not been changed
		this.#resetTimeMarksCache();
	}

	#resetTimeMarksCache(): void {
		this.#timeMarksCache = null;
	}

	#invalidateTickMarks(): void {
		this.#resetTimeMarksCache();
		this.#formattedBySpan.clear();
	}

	#updateDateTimeFormatter(): void {
		const dateFormat = this.#localizationOptions.dateFormat;

		if (this.#options.timeVisible) {
			this.#dateTimeFormatter = new DateTimeFormatter({
				dateFormat: dateFormat,
				timeFormat: this.#options.secondsVisible ? '%h:%m:%s' : '%h:%m',
				dateTimeSeparator: '   ',
				locale: this.#localizationOptions.locale,
			});
		} else {
			this.#dateTimeFormatter = new DateFormatter(dateFormat, this.#localizationOptions.locale);
		}
	}

	#fixLeftEdge(): void {
		if (!this.#options.fixLeftEdge) {
			return;
		}
		const firstIndex = this.#points.firstIndex();
		if (firstIndex === null || this.#leftEdgeIndex === firstIndex) {
			return;
		}

		this.#leftEdgeIndex = firstIndex;
		const delta = ensureNotNull(this.visibleBars()).firstBar() - firstIndex;
		if (delta < 0) {
			const leftEdgeOffset = this.#rightOffset - delta - 1;
			this.setRightOffset(leftEdgeOffset);
		}
	}
}
