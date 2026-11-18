// Run with `npm run bench`. Prints the metrics from the table in CLEANUP.md.

import { candles, firstTime } from '../tests/helpers/fixtures';
import { createHeadlessChart } from '../tests/helpers/headless-chart';
import { createNullContext } from '../tests/helpers/null-context';

import type { BarData } from '../src/api/data-consumer';
import type { UTCTimestamp } from '../src/model/time-scale/time-data';

declare const gc: () => void;

const WIDTH = 1200;
const HEIGHT = 600;
const REPEAT = 200;

function heap(): number {
	gc();
	gc();
	return process.memoryUsage().heapUsed + process.memoryUsage().arrayBuffers;
}

function fmt(value: number, digits: number = 1): string {
	return value.toFixed(digits).padStart(9);
}

function bar(index: number, close: number): BarData {
	return { time: (firstTime + index * 60) as UTCTimestamp, open: 100, high: 110, low: 90, close };
}

console.log('bars      | setData ms | B/bar | tick us | tick+draw us | append us | append+draw us | 1M-visible draw ms');

for (const count of [10_000, 100_000, 1_000_000]) {
	const ctx = createNullContext();
	const before = heap();

	const chart = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { timeScale: { barSpacing: 6 } } });
	const series = chart.addSeries('Candlestick');
	let data: BarData[] | null = candles(count);

	let start = performance.now();
	series.setData(data);
	const setDataMs = performance.now() - start;
	chart.draw(ctx, 2);

	// the caller drops its data; what stays is what the library keeps
	data = null;
	const bytesPerBar = (heap() - before) / count;

	start = performance.now();
	for (let i = 0; i < REPEAT; i++) {
		series.update(bar(count - 1, 100 + (i % 10)));
	}
	const tickUs = (performance.now() - start) / REPEAT * 1000;

	start = performance.now();
	for (let i = 0; i < REPEAT; i++) {
		series.update(bar(count - 1, 100 + (i % 10)));
		chart.draw(ctx, 2);
	}
	const tickDrawUs = (performance.now() - start) / REPEAT * 1000;

	// the first append makes the typed arrays grow to two times their size; that cost
	// is amortized over the next `count` appends, so it is not part of this timing
	series.update(bar(count, 100));
	start = performance.now();
	for (let i = 1; i <= REPEAT; i++) {
		series.update(bar(count + i, 100 + (i % 10)));
	}
	const appendUs = (performance.now() - start) / REPEAT * 1000;

	start = performance.now();
	for (let i = 0; i < REPEAT; i++) {
		series.update(bar(count + REPEAT + 1 + i, 100 + (i % 10)));
		chart.draw(ctx, 2);
	}
	const appendDrawUs = (performance.now() - start) / REPEAT * 1000;

	// all bars visible: bar spacing is much less than one device pixel
	let allVisibleMs = NaN;
	if (count === 1_000_000) {
		const wide = createHeadlessChart({ width: WIDTH, height: HEIGHT, options: { timeScale: { barSpacing: WIDTH / count } } });
		const wideSeries = wide.addSeries('Candlestick');
		wideSeries.setData(candles(count));
		wide.draw(ctx, 2);
		start = performance.now();
		for (let i = 0; i < 5; i++) {
			wideSeries.update(bar(count - 1, 100 + i));
			wide.draw(ctx, 2);
		}
		allVisibleMs = (performance.now() - start) / 5;
	}

	console.log(`${String(count).padStart(9)} | ${fmt(setDataMs)}  | ${fmt(bytesPerBar, 0).trim().padStart(5)} | ${fmt(tickUs).trim().padStart(7)} | ${fmt(tickDrawUs).trim().padStart(12)} | ${fmt(appendUs).trim().padStart(9)} | ${fmt(appendDrawUs).trim().padStart(14)} | ${Number.isNaN(allVisibleMs) ? '-' : fmt(allVisibleMs).trim()}`);
}
