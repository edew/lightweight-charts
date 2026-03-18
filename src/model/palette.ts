import { ensureDefined } from '../helpers/assertions';

export class Palette {
	#maxUsedIndex: number = 0;
	readonly #colorToIndex: Map<string, number> = new Map();
	readonly #indexToColor: Map<number, string> = new Map();

	public colorByIndex(index: number): string {
		return ensureDefined(this.#indexToColor.get(index));
	}

	public addColor(color: string): number {
		let res = this.#colorToIndex.get(color);
		if (res === undefined) {
			res = this.#maxUsedIndex++;
			this.#colorToIndex.set(color, res);
			this.#indexToColor.set(res, color);
		}
		return res;
	}

	public clear(): void {
		this.#maxUsedIndex = 0;
		this.#colorToIndex.clear();
		this.#indexToColor.clear();
	}

	public size(): number {
		return this.#indexToColor.size;
	}
}
