import { equal, greaterOrEqual, isBaseDecimal, log10 } from '../../helpers/mathex';

const TICK_SPAN_EPSILON = 1e-9;

export class PriceTickSpanCalculator {
	readonly #base: number;
	readonly #integralDividers: number[];
	readonly #fractionalDividers: number[];

	public constructor(base: number, integralDividers: number[]) {
		this.#base = base;
		this.#integralDividers = integralDividers;

		if (isBaseDecimal(this.#base)) {
			this.#fractionalDividers = [2, 2.5, 2];
		} else {
			this.#fractionalDividers = [];
			for (let baseRest = this.#base; baseRest !== 1;) {
				if ((baseRest % 2) === 0) {
					this.#fractionalDividers.push(2);
					baseRest /= 2;
				} else if ((baseRest % 5) === 0) {
					this.#fractionalDividers.push(2);
					this.#fractionalDividers.push(2.5);
					baseRest /= 5;
				} else {
					throw new Error('unexpected base');
				}

				if (this.#fractionalDividers.length > 100) {
					throw new Error('something wrong with base');
				}
			}
		}
	}

	public tickSpan(high: number, low: number, maxTickSpan: number): number {
		const minMovement = (this.#base === 0) ? (0) : (1 / this.#base);
		const tickSpanEpsilon = TICK_SPAN_EPSILON;

		let resultTickSpan = Math.pow(10, Math.max(0, Math.ceil(log10(high - low))));

		let index = 0;
		let c = this.#integralDividers[0];

		while (true) {
			// the second part is actual for small with very small values like 1e-10
			// greaterOrEqual fails for such values
			const resultTickSpanLargerMinMovement = greaterOrEqual(resultTickSpan, minMovement, tickSpanEpsilon) && resultTickSpan > (minMovement + tickSpanEpsilon);
			const resultTickSpanLargerMaxTickSpan = greaterOrEqual(resultTickSpan, maxTickSpan * c, tickSpanEpsilon);
			const resultTickSpanLarger1 = greaterOrEqual(resultTickSpan, 1, tickSpanEpsilon);
			const haveToContinue = resultTickSpanLargerMinMovement && resultTickSpanLargerMaxTickSpan && resultTickSpanLarger1;
			if (!haveToContinue) {
				break;
			}
			resultTickSpan /= c;
			c = this.#integralDividers[++index % this.#integralDividers.length];
		}

		if (resultTickSpan <= (minMovement + tickSpanEpsilon)) {
			resultTickSpan = minMovement;
		}

		resultTickSpan = Math.max(1, resultTickSpan);

		if ((this.#fractionalDividers.length > 0) && equal(resultTickSpan, 1, tickSpanEpsilon)) {
			index = 0;
			c = this.#fractionalDividers[0];
			while (greaterOrEqual(resultTickSpan, maxTickSpan * c, tickSpanEpsilon) && resultTickSpan > (minMovement + tickSpanEpsilon)) {
				resultTickSpan /= c;
				c = this.#fractionalDividers[++index % this.#fractionalDividers.length];
			}
		}

		return resultTickSpan;
	}
}
