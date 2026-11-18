
import type { Coordinate } from '../coordinate';
import type { PriceMark, PriceScale } from './price-scale';
import { PriceTickSpanCalculator } from './price-tick-span-calculator';

export type CoordinateToLogicalConverter = (x: number, firstValue: number) => number;
export type LogicalToCoordinateConverter = (x: number, firstValue: number, keepItFloat: boolean) => number;

const TICK_DENSITY = 2.5;

export class PriceTickMarkBuilder {
	#marks: PriceMark[] = [];
	// made one time: a tick span is calculated for each frame with a new price range
	readonly #spanCalculators: PriceTickSpanCalculator[];
	readonly #priceScale: PriceScale;
	readonly #coordinateToLogicalFunc: CoordinateToLogicalConverter;
	readonly #logicalToCoordinateFunc: LogicalToCoordinateConverter;

	public constructor(
		priceScale: PriceScale,
		base: number,
		coordinateToLogicalFunc: CoordinateToLogicalConverter,
		logicalToCoordinateFunc: LogicalToCoordinateConverter
	) {
		this.#priceScale = priceScale;
		this.#spanCalculators = [
			new PriceTickSpanCalculator(base, [2, 2.5, 2]),
			new PriceTickSpanCalculator(base, [2, 2, 2.5]),
			new PriceTickSpanCalculator(base, [2.5, 2, 2]),
		];
		this.#coordinateToLogicalFunc = coordinateToLogicalFunc;
		this.#logicalToCoordinateFunc = logicalToCoordinateFunc;
	}

	public rebuildTickMarks(): void {
		const priceScale = this.#priceScale;

		const firstValue = priceScale.firstValue();

		if (firstValue === null) {
			this.#marks = [];
			return;
		}

		const scaleHeight = priceScale.height();

		const bottom = this.#coordinateToLogicalFunc(scaleHeight - 1, firstValue);
		const top = this.#coordinateToLogicalFunc(0, firstValue);

		const extraTopBottomMargin = this.#priceScale.options().entireTextOnly ? this.#fontHeight() / 2 : 0;
		const minCoord = extraTopBottomMargin;
		const maxCoord = scaleHeight - 1 - extraTopBottomMargin;

		const high = Math.max(bottom, top);
		const low = Math.min(bottom, top);
		if (high === low) {
			this.#marks = [];
			return;
		}

		let span = this.#tickSpan(high, low);
		let mod = high % span;
		mod += mod < 0 ? span : 0;

		const sign = (high >= low) ? 1 : -1;
		let prevCoord: number | null = null;

		let targetIndex = 0;

		for (let logical = high - mod; logical > low; logical -= span) {
			const coord = this.#logicalToCoordinateFunc(logical, firstValue, true);

			// check if there is place for it
			// this is required for log scale
			if (prevCoord !== null && Math.abs(coord - prevCoord) < this.#tickMarkHeight()) {
				continue;
			}

			// check if a tick mark is partially visible and skip it if entireTextOnly is true
			if (coord < minCoord || coord > maxCoord) {
				continue;
			}

			if (targetIndex < this.#marks.length) {
				this.#marks[targetIndex].coord = coord as Coordinate;
				this.#marks[targetIndex].label = priceScale.formatLogical(logical);
			} else {
				this.#marks.push({
					coord: coord as Coordinate,
					label: priceScale.formatLogical(logical),
				});
			}

			targetIndex++;

			prevCoord = coord;
			if (priceScale.isLog()) {
				// recalc span
				span = this.#tickSpan(logical * sign, low);
			}
		}
		this.#marks.length = targetIndex;
	}

	public marks(): PriceMark[] {
		return this.#marks;
	}

	#tickSpan(high: number, low: number): number {
		if (high < low) {
			throw new Error('high < low');
		}

		const scaleHeight = this.#priceScale.height();
		const markHeight = this.#tickMarkHeight();

		const maxTickSpan = (high - low) * markHeight / scaleHeight;

		const calculators = this.#spanCalculators;
		return Math.min(
			calculators[0].tickSpan(high, low, maxTickSpan),
			calculators[1].tickSpan(high, low, maxTickSpan),
			calculators[2].tickSpan(high, low, maxTickSpan)
		);
	}

	#fontHeight(): number {
		return this.#priceScale.fontSize();
	}

	#tickMarkHeight(): number {
		return Math.ceil(this.#fontHeight() * TICK_DENSITY);
	}
}
