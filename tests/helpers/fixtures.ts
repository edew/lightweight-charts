import type { BarData, LineData } from '../../src/api/data-consumer';
import type { UTCTimestamp } from '../../src/model/time-scale/time-data';

// Fixed data with no randomness from the platform.

function lcg(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

export const firstTime = 1600000000;

export function candles(count: number, stepSeconds: number = 60, seed: number = 1): BarData[] {
	const next = lcg(seed);
	const result: BarData[] = [];
	let close = 100;
	for (let i = 0; i < count; i++) {
		const open = close;
		// each tenth bar is flat (open === close)
		close = i % 10 === 9 ? open : Math.round((open + (next() - 0.5) * 4) * 100) / 100;
		const high = Math.round((Math.max(open, close) + next() * 2) * 100) / 100;
		const low = Math.round((Math.min(open, close) - next() * 2) * 100) / 100;
		result.push({ time: (firstTime + i * stepSeconds) as UTCTimestamp, open, high, low, close });
	}
	return result;
}

export function line(count: number, stepSeconds: number = 60, seed: number = 2): LineData[] {
	const next = lcg(seed);
	const result: LineData[] = [];
	let value = 50;
	for (let i = 0; i < count; i++) {
		value = Math.round((value + (next() - 0.5) * 3) * 100) / 100;
		result.push({ time: (firstTime + i * stepSeconds) as UTCTimestamp, value });
	}
	return result;
}
