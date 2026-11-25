// The debug page: many small charts, one card for each group of examples.
// The groups follow the live examples on https://www.tradingview.com/lightweight-charts/,
// without the examples that need a feature that this library does not have.
//
// In the console: `charts['Chart type']` is the chart that the card shows now.

import {
	Candlestick,
	createChart,
	CrosshairMode,
	Line,
	LineStyle,
	LineType,
	PriceScaleMode,
	version,
} from '../src/index.ts';

document.getElementById('version').textContent = 'lightweight-charts ' + version();

const DAY = 24 * 60 * 60;
const START = Date.UTC(2018, 8, 3) / 1000;
const COLORS = ['#2962ff', '#e91e63', '#26a69a', '#ff9800', '#ab47bc'];

window.charts = {};

// ---- data

/** Fixed pseudo-random numbers, so that the page is the same on each load. */
function randomSource(seed) {
	return () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}

function round(price) {
	return Math.round(price * 100) / 100;
}

/** A random walk. Each step is a fraction of the price, thus the price stays above zero. */
function candles(count, { seed = 1, start = START, step = DAY, price = 100, volatility = 0.02, drift = 0 } = {}) {
	const random = randomSource(seed);
	const res = [];
	let close = price;
	for (let i = 0; i < count; i++) {
		const open = close;
		close = round(open * (1 + drift + (random() - 0.5) * 2 * volatility));
		const high = round(Math.max(open, close) * (1 + random() * volatility / 2));
		const low = round(Math.min(open, close) * (1 - random() * volatility / 2));
		res.push({ time: start + i * step, open, high, low, close });
	}
	return res;
}

function closes(bars) {
	return bars.map((bar) => ({ time: bar.time, value: bar.close }));
}

function line(count, options) {
	return closes(candles(count, options));
}

function movingAverage(bars, length) {
	let sum = 0;
	return bars.map((bar, i) => {
		sum += bar.close;
		if (i >= length) {
			sum -= bars[i - length].close;
		}
		return { time: bar.time, value: sum / Math.min(i + 1, length) };
	});
}

function volumes(bars, seed = 7) {
	const random = randomSource(seed);
	return bars.map((bar) => ({ time: bar.time, value: Math.round(1000 + random() * 9000) }));
}

/** The text of a time from the chart: seconds or a business day. */
function timeText(time, withTime = false) {
	const date = typeof time === 'number' ? new Date(time * 1000) : new Date(Date.UTC(time.year, time.month - 1, time.day));
	return date.toISOString().slice(0, withTime ? 16 : 10).replace('T', ' ');
}

function dateString(seconds) {
	return new Date(seconds * 1000).toISOString().slice(0, 10);
}

// ---- page

// dense: small text, small margins above and below the series, dotted grid
const darkTheme = {
	layout: { backgroundColor: '#000000', textColor: '#b2b5be', fontSize: 10, fontFamily: '\'SF Mono\', Menlo, Consolas, \'DejaVu Sans Mono\', monospace' },
	grid: { vertLines: { color: '#333333', style: LineStyle.Dotted }, horzLines: { color: '#333333', style: LineStyle.Dotted } },
	priceScale: { borderColor: '#3a3a3a', scaleMargins: { top: 0.06, bottom: 0.04 } },
	timeScale: { borderColor: '#3a3a3a' },
	crosshair: { vertLine: { color: '#555b66' }, horzLine: { color: '#555b66' } },
};

const noGrid = { grid: { vertLines: { visible: false }, horzLines: { visible: false } } };

function element(tag, className, parent) {
	const res = document.createElement(tag);
	res.className = className;
	parent.appendChild(res);
	return res;
}

/**
 * Makes a chart that has the size of its container. `scope.onDispose` gets the cleanup.
 * `options` are added to the dark theme (one level deep is sufficient for this page).
 */
function makeChart(scope, ...options) {
	const container = scope.container;
	const merged = { width: container.clientWidth, height: container.clientHeight };
	for (const part of [darkTheme, ...options]) {
		for (const key of Object.keys(part)) {
			const value = part[key];
			merged[key] = typeof value === 'object' ? { ...merged[key], ...value } : value;
		}
	}

	const chart = createChart(container, merged);
	const observer = new ResizeObserver(() => chart.resize(container.clientWidth, container.clientHeight));
	observer.observe(container);
	scope.onDispose(() => {
		observer.disconnect();
		chart.remove();
	});
	window.charts[scope.title] = chart;
	return chart;
}

/**
 * Adds a card. `setup(scope)` is called one time and returns `select(index)`,
 * which the page calls when the user selects a tab.
 */
function card(title, labels, setup) {
	const root = element('section', 'card', document.getElementById('cards'));
	const head = element('div', 'head', root);
	element('h2', '', head).textContent = title;
	const tabs = element('div', 'tabs', head);
	const container = element('div', 'chart', root);

	const disposers = [];
	const scope = {
		title,
		container,
		onDispose: (fn) => disposers.push(fn),
		dispose: () => {
			while (disposers.length !== 0) {
				disposers.pop()();
			}
			container.textContent = '';
		},
	};

	const select = setup(scope);
	const buttons = labels.map((label, index) => {
		const button = element('button', '', tabs);
		button.textContent = label;
		button.addEventListener('click', () => activate(index));
		return button;
	});

	function activate(index) {
		buttons.forEach((button, i) => button.classList.toggle('active', i === index));
		select(index);
	}

	activate(0);
}

/** For a card that makes a new chart for each tab: this also exercises `chart.remove()`. */
function perTab(builders) {
	return (scope) => (index) => {
		scope.dispose();
		builders[index](scope);
	};
}

// ---- data sets that more than one card uses

const dailyCandles = candles(150, { seed: 3, price: 60, volatility: 0.03 });
const dailyLine = line(150, { seed: 11, price: 40, volatility: 0.03, drift: 0.002 });

// ---- cards

card('Chart type', ['Candles', 'Line', 'Step line'], perTab([
	(scope) => {
		// the times are strings here: the other cards use seconds
		const data = dailyCandles.map((bar) => ({ ...bar, time: dateString(bar.time) }));
		makeChart(scope).addSeries(Candlestick()).setData(data);
	},
	(scope) => {
		makeChart(scope).addSeries(Line({ color: '#2962ff', lineWidth: 1 })).setData(closes(dailyCandles));
	},
	(scope) => {
		const chart = makeChart(scope, { timeScale: { barSpacing: 12 } });
		chart.addSeries(Line({ color: '#26a69a', lineWidth: 1, lineType: LineType.WithSteps })).setData(closes(dailyCandles));
	},
]));

card('Custom theme', ['Dark', 'Light', 'Colorful'], (scope) => {
	const chart = makeChart(scope);
	const series = chart.addSeries(Line({ lineWidth: 1 }));
	series.setData(dailyLine);
	chart.timeScale().fitContent();

	const themes = [
		{ background: '#000000', text: '#b2b5be', grid: '#333333', line: '#ffffff', cross: '#555b66' },
		{ background: '#ffffff', text: '#191919', grid: '#e9ecef', line: '#2962ff', cross: '#9598a1' },
		{ background: '#2b2b43', text: '#d9d9d9', grid: '#3f3f5f', line: '#f48fb1', cross: '#f48fb1' },
	];

	return (index) => {
		const theme = themes[index];
		chart.applyOptions({
			layout: { backgroundColor: theme.background, textColor: theme.text },
			grid: { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
			crosshair: {
				vertLine: { color: theme.cross, labelBackgroundColor: theme.line },
				horzLine: { color: theme.cross, labelBackgroundColor: theme.line },
			},
		});
		series.applyOptions({ color: theme.line });
	};
});

card('Range switcher', ['1D', '1W', '1M', '1Y'], (scope) => {
	const chart = makeChart(scope, noGrid);
	const series = chart.addSeries(Line({ color: '#2962ff', lineWidth: 1 }));

	const end = START + 365 * DAY;
	const ranges = [
		{ count: 24 * 12, step: 5 * 60, timeVisible: true },
		{ count: 7 * 24, step: 60 * 60, timeVisible: true },
		{ count: 30, step: DAY, timeVisible: false },
		{ count: 365, step: DAY, timeVisible: false },
	].map((range, i) => ({
		timeVisible: range.timeVisible,
		data: line(range.count, { seed: 20 + i, start: end - range.count * range.step, step: range.step, price: 26, volatility: 0.004 + i * 0.004 }),
	}));

	return (index) => {
		const range = ranges[index];
		series.setData(range.data);
		chart.applyOptions({ timeScale: { timeVisible: range.timeVisible, secondsVisible: false } });
		chart.timeScale().fitContent();
	};
});

card('Legend', ['1-line legend', '3-line legend'], (scope) => {
	const chart = makeChart(scope, noGrid, { priceScale: { scaleMargins: { top: 0.25, bottom: 0.04 } } });
	const series = chart.addSeries(Line({ color: '#26c6da', lineWidth: 1 }));
	series.setData(dailyLine);
	chart.timeScale().fitContent();

	const legend = element('div', 'over legend', scope.container);
	const last = dailyLine[dailyLine.length - 1];
	let lines = 1;
	let price = last.value;
	let time = last.time;

	function show() {
		const text = series.priceFormatter().format(price);
		legend.innerHTML = lines === 1
			? `ETC USD 7D VWAP &nbsp;<span style="color:#26c6da">${text}</span>`
			: `ETC USD 7D VWAP<b>${text}</b>${timeText(time)}`;
	}

	chart.subscribeCrosshairMove((param) => {
		const value = param.seriesPrices.get(series);
		price = value ?? last.value;
		time = value !== undefined ? param.time : last.time;
		show();
	});

	return (index) => {
		lines = index === 0 ? 1 : 3;
		show();
	};
});

card('Series compare', ['1 series', '2 series', '3 series', '4 series', '5 series'], (scope) => {
	const chart = makeChart(scope, { priceScale: { mode: PriceScaleMode.Percentage } });
	const all = [];

	return (index) => {
		// this exercises addSeries() and removeSeries() on a chart that has data
		while (all.length > index + 1) {
			chart.removeSeries(all.pop());
		}
		while (all.length < index + 1) {
			const n = all.length;
			const series = chart.addSeries(Line({ color: COLORS[n], lineWidth: 1, title: 'S' + (n + 1) }));
			series.setData(line(150, { seed: 40 + n, price: 20 + n * 30, volatility: 0.03, drift: (n - 2) * 0.001 }));
			all.push(series);
		}
		chart.timeScale().fitContent();
	};
});

card('Additional options', ['Custom watermark', 'Go to realtime button'], perTab([
	(scope) => {
		const chart = makeChart(scope, noGrid, {
			watermark: { visible: true, text: 'Watermark Example', fontSize: 18, color: 'rgba(171, 71, 188, 0.5)', horzAlign: 'center', vertAlign: 'center' },
		});
		chart.addSeries(Line({ color: '#ab47bc', lineWidth: 1 })).setData(dailyLine);
		chart.timeScale().fitContent();
	},
	(scope) => {
		const chart = makeChart(scope, noGrid, { timeScale: { rightOffset: 4 } });
		chart.addSeries(Line({ color: '#ab47bc', lineWidth: 1 })).setData(line(400, { seed: 12, volatility: 0.02 }));

		const button = element('button', 'over', scope.container);
		button.textContent = 'Go to realtime →';
		button.style.right = '56px';
		button.style.bottom = '24px';
		button.addEventListener('click', () => chart.timeScale().scrollToRealTime());

		// the button is shown only when the last bar is not at its default position
		const update = () => {
			button.style.display = chart.timeScale().scrollPosition() < 0 ? 'block' : 'none';
		};
		chart.subscribeVisibleTimeRangeChange(update);
		chart.timeScale().scrollToPosition(-40, false);
		update();
	},
]));

card('Data tooltip', ['Floating tooltip', 'Tracking tooltip'], (scope) => {
	const chart = makeChart(scope, noGrid, {
		crosshair: {
			mode: CrosshairMode.Magnet,
			horzLine: { visible: false, labelVisible: false },
			vertLine: { color: '#555b66', labelVisible: false },
		},
	});
	const series = chart.addSeries(Line({ color: '#ef5350', lineWidth: 1 }));
	series.setData(dailyLine);
	chart.timeScale().fitContent();

	const tooltip = element('div', 'over tooltip', scope.container);
	const width = 94;
	const height = 46;
	let tracking = false;

	chart.subscribeCrosshairMove((param) => {
		const value = param.seriesPrices.get(series);
		if (param.point === undefined || value === undefined) {
			tooltip.style.display = 'none';
			return;
		}

		tooltip.style.display = 'block';
		tooltip.innerHTML = `Apple Inc.<b>${series.priceFormatter().format(value)}</b>${timeText(param.time)}`;

		const maxLeft = scope.container.clientWidth - width;
		const maxTop = scope.container.clientHeight - height;
		let left;
		let top;
		if (tracking) {
			// above the point of the series
			const y = series.priceToCoordinate(value) ?? 0;
			left = param.point.x - width / 2;
			top = y - height - 8 > 0 ? y - height - 8 : y + 8;
		} else {
			// adjacent to the pointer
			left = param.point.x + 10 > maxLeft ? param.point.x - 10 - width : param.point.x + 10;
			top = param.point.y + 10;
		}
		tooltip.style.left = Math.max(0, Math.min(maxLeft, left)) + 'px';
		tooltip.style.top = Math.max(0, Math.min(maxTop, top)) + 'px';
	});

	return (index) => {
		tracking = index === 1;
		tooltip.style.display = 'none';
	};
});

card('Scales formatting', ['Custom price formatter', 'Custom locale', 'Custom font family'], perTab([
	(scope) => {
		const chart = makeChart(scope, { localization: { priceFormatter: (price) => '$' + price.toFixed(2) } });
		chart.addSeries(Candlestick()).setData(dailyCandles);
	},
	(scope) => {
		const chart = makeChart(scope, { localization: { locale: 'ja-JP', dateFormat: 'yyyy MMM dd' } });
		chart.addSeries(Candlestick()).setData(dailyCandles);
	},
	(scope) => {
		const chart = makeChart(scope, { layout: { fontFamily: 'Georgia, serif', fontSize: 11 } });
		chart.addSeries(Candlestick()).setData(dailyCandles);
	},
]));

card('Price scale', ['Regular', 'Logarithmic', 'Percentage', 'Indexed to 100', 'Inverted'], (scope) => {
	const chart = makeChart(scope);
	// a large change of the price, so that the logarithmic mode shows a difference
	chart.addSeries(Line({ color: '#26a69a', lineWidth: 1 })).setData(line(300, { seed: 5, price: 5, volatility: 0.04, drift: 0.012 }));
	chart.timeScale().fitContent();

	const modes = [PriceScaleMode.Normal, PriceScaleMode.Logarithmic, PriceScaleMode.Percentage, PriceScaleMode.IndexedTo100, PriceScaleMode.Normal];
	return (index) => chart.priceScale().applyOptions({ mode: modes[index], invertScale: index === 4 });
});

card('Scales config', ['Pin to right', 'Pin to left', 'No price scale', 'No time scale', 'Overlay series'], (scope) => {
	const chart = makeChart(scope, noGrid);
	chart.addSeries(Line({ color: '#7e57c2', lineWidth: 1 })).setData(dailyLine);
	chart.timeScale().fitContent();
	let overlay = null;

	return (index) => {
		chart.applyOptions({
			priceScale: { position: index === 1 ? 'left' : index === 2 ? 'none' : 'right' },
			timeScale: { visible: index !== 3 },
		});

		// an overlay series has its own price scale, which has no axis
		if (index === 4 && overlay === null) {
			overlay = chart.addSeries(Line({ color: '#ff9800', lineWidth: 1, overlay: true, scaleMargins: { top: 0.6, bottom: 0.05 } }));
			overlay.setData(volumes(dailyLine));
		} else if (index !== 4 && overlay !== null) {
			chart.removeSeries(overlay);
			overlay = null;
		}
	};
});

card('Data', ['Realtime updates', 'Whitespaces', 'Infinite history'], perTab([
	(scope) => {
		const chart = makeChart(scope, { timeScale: { rightOffset: 3, timeVisible: true, secondsVisible: false } });
		const series = chart.addSeries(Candlestick());
		const data = candles(120, { seed: 9, step: 60, volatility: 0.004 });
		series.setData(data);

		// ten ticks for each bar: nine changes of the last bar, then a new bar
		let last = { ...data[data.length - 1] };
		let ticks = 0;
		const timer = setInterval(() => {
			if (++ticks % 10 === 0) {
				last = { time: last.time + 60, open: last.close, high: last.close, low: last.close, close: last.close };
			}
			last.close = round(last.close * (1 + (Math.random() - 0.5) * 0.004));
			last.high = Math.max(last.high, last.close);
			last.low = Math.min(last.low, last.close);
			series.update(last);
		}, 100);
		scope.onDispose(() => clearInterval(timer));
	},
	(scope) => {
		// a value that is not a number makes a gap in the line
		const chart = makeChart(scope);
		const data = closes(dailyCandles).map((point, i) => (i % 40 >= 30 ? { time: point.time, value: NaN } : point));
		chart.addSeries(Line({ color: '#2962ff', lineWidth: 1 })).setData(data);
		chart.timeScale().fitContent();
		element('div', 'over note', scope.container).textContent = 'Each 40 points: 10 points with no value';
	},
	(scope) => {
		const chart = makeChart(scope);
		const series = chart.addSeries(Candlestick());
		const chunk = 100;
		const all = candles(5000, { seed: 4, start: START - 5000 * DAY, volatility: 0.02 });
		let first = all.length - chunk;
		series.setData(all.slice(first));

		const note = element('div', 'over note', scope.container);
		const show = () => {
			note.textContent = `Scroll to the left: ${all.length - first} of ${all.length} bars loaded`;
		};
		show();

		// when the first bar comes into view, give the series more bars
		chart.subscribeVisibleTimeRangeChange((range) => {
			if (range === null || first === 0 || range.from > all[first].time) {
				return;
			}
			first = Math.max(0, first - chunk);
			series.setData(all.slice(first));
			show();
		});
	},
]));

card('Indicators', ['Moving average', 'Volume overlay', 'Two averages'], perTab([
	(scope) => {
		const chart = makeChart(scope);
		chart.addSeries(Candlestick()).setData(dailyCandles);
		chart.addSeries(Line({ color: '#ff9800', lineWidth: 1, lastValueVisible: false, crosshairMarkerVisible: false })).setData(movingAverage(dailyCandles, 20));
	},
	(scope) => {
		// there is no histogram series: the volume is a step line at the bottom of the pane
		const chart = makeChart(scope, { priceScale: { scaleMargins: { top: 0.06, bottom: 0.25 } } });
		chart.addSeries(Candlestick()).setData(dailyCandles);
		const volume = chart.addSeries(Line({
			color: '#5c6bc0',
			lineWidth: 1,
			lineType: LineType.WithSteps,
			overlay: true,
			scaleMargins: { top: 0.8, bottom: 0 },
			priceFormat: { type: 'volume', precision: 1, minMove: 1 },
		}));
		volume.setData(volumes(dailyCandles));
	},
	(scope) => {
		const chart = makeChart(scope);
		chart.addSeries(Line({ color: '#787b86', lineWidth: 1 })).setData(closes(dailyCandles));
		chart.addSeries(Line({ color: '#ff9800', lineWidth: 1, title: 'MA 10', crosshairMarkerVisible: false })).setData(movingAverage(dailyCandles, 10));
		chart.addSeries(Line({ color: '#2962ff', lineWidth: 1, title: 'MA 30', crosshairMarkerVisible: false })).setData(movingAverage(dailyCandles, 30));
	},
]));

card('Panes', ['2 panes', '3 panes', 'Equal heights'], (scope) => {
	const chart = makeChart(scope);
	chart.addSeries(Candlestick({ title: 'MAIN' })).setData(dailyCandles);
	chart.addSeries(Line({ pane: 1, color: '#7b61ff', lineWidth: 1, priceFormat: { type: 'volume', precision: 1, minMove: 1 } })).setData(volumes(dailyCandles));
	let third = null;

	return (index) => {
		if (index !== 0 && third === null) {
			third = chart.addSeries(Line({ pane: 2, color: '#26a69a', lineWidth: 1 }));
			third.setData(line(150, { seed: 30, price: 50, volatility: 0.05 }));
		} else if (index === 0 && third !== null) {
			chart.removeSeries(third);
			third = null;
		}
		chart.panes().forEach((pane, i) => pane.setStretchFactor(index !== 2 && i === 0 ? 3 : 1));
	};
});

card('Crosshair', ['Magnet', 'Normal', 'Custom style', 'No labels'], (scope) => {
	const chart = makeChart(scope);
	chart.addSeries(Line({ color: '#2962ff', lineWidth: 1, crosshairMarkerRadius: 5 })).setData(dailyLine);
	chart.timeScale().fitContent();

	const lineDefaults = { color: '#555b66', width: 1, style: LineStyle.LargeDashed, labelVisible: true, labelBackgroundColor: '#4c525e' };
	const custom = { color: '#ff9800', width: 2, style: LineStyle.Solid, labelVisible: true, labelBackgroundColor: '#ff9800' };
	const noLabels = { ...lineDefaults, labelVisible: false };

	return (index) => {
		const lineOptions = index === 2 ? custom : index === 3 ? noLabels : lineDefaults;
		chart.applyOptions({
			crosshair: {
				mode: index === 1 ? CrosshairMode.Normal : CrosshairMode.Magnet,
				vertLine: lineOptions,
				horzLine: lineOptions,
			},
		});
	};
});

card('Line style', ['Solid', 'Dotted', 'Dashed', 'Large dashed', 'Sparse dotted'], (scope) => {
	const chart = makeChart(scope, noGrid);
	const all = [1, 2, 3, 4].map((width, n) => {
		const series = chart.addSeries(Line({ color: COLORS[n], lineWidth: width, lastValueVisible: false }));
		series.setData(line(60, { seed: 50 + n, price: 40 + n * 20, volatility: 0.02 }));
		return series;
	});
	chart.timeScale().fitContent();

	const styles = [LineStyle.Solid, LineStyle.Dotted, LineStyle.Dashed, LineStyle.LargeDashed, LineStyle.SparseDotted];
	return (index) => all.forEach((series) => series.applyOptions({ lineStyle: styles[index] }));
});

card('Large data', ['10 000 points', '100 000 points', '1 000 000 points'], (scope) => {
	const chart = makeChart(scope, { timeScale: { timeVisible: true } });
	const series = chart.addSeries(Line({ color: '#26a69a', lineWidth: 1 }));
	const note = element('div', 'over note', scope.container);

	return (index) => {
		const count = 10000 * 10 ** index;
		const data = line(count, { seed: 60 + index, start: START - count * 60, step: 60, volatility: 0.001 });
		const before = performance.now();
		series.setData(data);
		chart.timeScale().fitContent();
		note.textContent = `setData(): ${(performance.now() - before).toFixed(1)} ms`;
	};
});
