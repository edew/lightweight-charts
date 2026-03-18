import { isNumber } from '../helpers/strict-type-checks';

class PriceRange {
	#minValue: number;
	#maxValue!: number;

	public constructor(minValue: number, maxValue: number) {
		this.#minValue = minValue;
		this.#maxValue = maxValue;
	}

	public equals(pr: PriceRange | null): boolean {
		if (pr === null) {
			return false;
		}
		return this.#minValue === pr.#minValue && this.#maxValue === pr.#maxValue;
	}

	public clone(): PriceRange {
		return new PriceRange(this.#minValue, this.#maxValue);
	}

	public minValue(): number {
		return this.#minValue;
	}

	public maxValue(): number {
		return this.#maxValue;
	}

	public length(): number {
		return this.#maxValue - this.#minValue;
	}

	public isEmpty(): boolean {
		return this.#maxValue === this.#minValue || Number.isNaN(this.#maxValue) || Number.isNaN(this.#minValue);
	}

	public merge(anotherRange: PriceRange | null): PriceRange {
		if (anotherRange === null) {
			return this;
		}
		return new PriceRange(
			Math.min(this.minValue(), anotherRange.minValue()),
			Math.max(this.maxValue(), anotherRange.maxValue())
		);
	}

	public scaleAroundCenter(coeff: number): void {
		if (!isNumber(coeff)) {
			return;
		}

		const delta = this.#maxValue - this.#minValue;
		if (delta === 0) {
			return;
		}

		const center = (this.#maxValue + this.#minValue) * 0.5;
		let maxDelta = this.#maxValue - center;
		let minDelta = this.#minValue - center;
		maxDelta *= coeff;
		minDelta *= coeff;
		this.#maxValue = center + maxDelta;
		this.#minValue = center + minDelta;
	}

	public shift(delta: number): void {
		if (!isNumber(delta)) {
			return;
		}

		this.#maxValue += delta;
		this.#minValue += delta;
	}
}

export { PriceRange };
