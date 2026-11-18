// A canvas context that records each call and each property write as one line of
// text. Tests use it to check what the draw code asks the canvas to do.

export interface RecordingContext {
	ctx: CanvasRenderingContext2D;
	/** One line for each call ("fillRect(0,0,10,10)") and each property write ("fillStyle=#fff"). */
	log: string[];
	/** Number of calls of a method, or of writes of a property. */
	count(name: string): number;
	clear(): void;
}

function format(value: unknown): string {
	if (typeof value === 'number') {
		// round, so that the log does not depend on the last bits of a float
		return String(Math.round(value * 1000) / 1000);
	}
	if (Array.isArray(value)) {
		return '[' + value.map(format).join(',') + ']';
	}
	return String(value);
}

export function createRecordingContext(): RecordingContext {
	const log: string[] = [];
	const properties = new Map<string, unknown>();

	const ctx = new Proxy({}, {
		get(_target: object, name: string): unknown {
			if (properties.has(name)) {
				return properties.get(name);
			}
			if (name === 'measureText') {
				return (text: string) => ({ width: text.length * 6 });
			}
			return (...args: unknown[]) => {
				log.push(`${name}(${args.map(format).join(',')})`);
			};
		},
		set(_target: object, name: string, value: unknown): boolean {
			properties.set(name, value);
			log.push(`${name}=${format(value)}`);
			return true;
		},
	}) as unknown as CanvasRenderingContext2D;

	return {
		ctx,
		log,
		count(name: string): number {
			let result = 0;
			for (const line of log) {
				if (line.startsWith(name + '(') || line.startsWith(name + '=')) {
					result++;
				}
			}
			return result;
		},
		clear(): void {
			log.length = 0;
		},
	};
}
