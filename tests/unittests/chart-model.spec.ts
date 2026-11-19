import { expect } from 'chai';
import { beforeEach, describe, it } from 'vitest';

import { chartOptionsDefaults } from '../../src/api/options/chart-options-defaults';
import { seriesOptionsFromSpec } from '../../src/api/series-api';
import { clone } from '../../src/helpers/strict-type-checks';
import { ChartModel, type ChartOptionsInternal, InvalidationLevel } from '../../src/model/chart-model';
import { CrosshairMode } from '../../src/model/crosshair';
import type { SortedTimes } from '../../src/model/data-store';
import type { Series } from '../../src/model/series';
import type { TimePointIndex } from '../../src/model/time-scale/time-data';
import { Candlestick } from '../../src/series/candlestick';
import { Line } from '../../src/series/line';

function createModel(): { model: ChartModel; invalidations: InvalidationLevel[] } {
	const invalidations: InvalidationLevel[] = [];
	const options: ChartOptionsInternal = clone(chartOptionsDefaults);
	return { model: new ChartModel((level: InvalidationLevel) => invalidations.push(level), options), invalidations };
}

function addLine(model: ChartModel, pane: number = 0, overlay: boolean = false): Series {
	const spec = overlay ? Line({ pane, overlay: true, scaleMargins: { top: 0.5, bottom: 0 } }) : Line({ pane });
	const options = seriesOptionsFromSpec(spec);
	return model.createSeries(spec.kind, options, options.pane) as unknown as Series;
}

function setLine(model: ChartModel, series: Series, times: number[], values: number[]): void {
	model.setSeriesData(series, new Float64Array(times) as SortedTimes, new Float64Array(values), false);
}

describe('ChartModel', () => {
	let model: ChartModel;
	let invalidations: InvalidationLevel[];

	beforeEach(() => {
		const result = createModel();
		model = result.model;
		invalidations = result.invalidations;
		model.setSize(100, [100]);
	});

	it('has one pane after construction and asks for a full update', () => {
		expect(model.panes().length).to.equal(1);
		expect(invalidations[0]).to.equal(InvalidationLevel.Full);
	});

	it('fullUpdate and lightUpdate call the invalidate handler with the level', () => {
		invalidations.length = 0;
		model.fullUpdate();
		expect(invalidations.pop()).to.equal(InvalidationLevel.Full);
		model.lightUpdate();
		expect(invalidations.pop()).to.equal(InvalidationLevel.Light);
	});

	it('applyOptions gives price scale options to all panes and asks for a full update', () => {
		addLine(model, 1);
		invalidations.length = 0;
		model.applyOptions({ priceScale: { invertScale: true } });
		expect(model.panes()[0].priceScale.options().invertScale).to.equal(true);
		expect(model.panes()[1].priceScale.options().invertScale).to.equal(true);
		expect(invalidations.pop()).to.equal(InvalidationLevel.Full);
	});

	describe('panes', () => {
		it('adds a series to the first pane by default', () => {
			const series = addLine(model);
			expect(model.panes().length).to.equal(1);
			expect(series.pane()).to.equal(model.panes()[0]);
			expect(series.priceScale()).to.equal(model.panes()[0].priceScale);
		});

		it('makes a new pane when the pane index is equal to the number of panes', () => {
			const first = addLine(model);
			const second = addLine(model, 1);
			expect(model.panes().length).to.equal(2);
			expect(second.pane()).to.equal(model.panes()[1]);
			expect(second.priceScale()).to.not.equal(first.priceScale());
		});

		it('throws when the pane index is too large', () => {
			expect(() => addLine(model, 2)).to.throw('Invalid pane index');
		});

		it('removes a pane when its last series is removed, but not the first pane', () => {
			const first = addLine(model);
			const second = addLine(model, 1);
			model.removeSeries(second);
			expect(model.panes().length).to.equal(1);
			model.removeSeries(first);
			expect(model.panes().length).to.equal(1);
			expect(model.panes()[0].series.length).to.equal(0);
		});

		it('gives an overlay series its own price scale with its margins', () => {
			const main = addLine(model);
			const overlay = addLine(model, 0, true);
			expect(overlay.pane()).to.equal(main.pane());
			expect(overlay.priceScale()).to.not.equal(main.priceScale());
			expect(overlay.priceScale().options().scaleMargins.top).to.equal(0.5);
		});

		it('setSize gives each pane its height', () => {
			addLine(model, 1);
			model.setSize(200, [60, 40]);
			expect(model.timeScale().width()).to.equal(200);
			expect(model.panes()[0].height()).to.equal(60);
			expect(model.panes()[1].height()).to.equal(40);
			expect(model.panes()[1].priceScale.height()).to.equal(40);
		});
	});

	describe('data', () => {
		it('sets the base index to the last time point when data changes', () => {
			const series = addLine(model);
			expect(model.timeScale().baseIndex()).to.equal(0 as TimePointIndex);
			setLine(model, series, [10, 20, 30], [1, 2, 3]);
			expect(model.timeScale().baseIndex()).to.equal(2 as TimePointIndex);
			model.updateSeriesData(series, 40, 4, 0, 0, 0);
			expect(model.timeScale().baseIndex()).to.equal(3 as TimePointIndex);
		});

		it('an in-place update invalidates only the pane of the series and does not touch the time scale', () => {
			const first = addLine(model);
			const second = addLine(model, 1);
			setLine(model, first, [10, 20], [1, 2]);
			setLine(model, second, [10, 20], [5, 6]);

			let visibleBarsChanged = 0;
			model.timeScale().visibleBarsChanged().subscribe(() => visibleBarsChanged++);
			model.timeScale().visibleBars();
			visibleBarsChanged = 0;
			invalidations.length = 0;

			model.updateSeriesData(second, 20, 7, 0, 0, 0);

			expect(invalidations.length).to.equal(1);
			expect(invalidations[0]).to.equal(InvalidationLevel.Light);
			model.timeScale().visibleBars();
			expect(visibleBarsChanged).to.equal(0);
			expect(model.timeScale().baseIndex()).to.equal(1 as TimePointIndex);
		});

		it('removeSeries removes the time points of the series', () => {
			const first = addLine(model);
			const second = addLine(model);
			setLine(model, first, [10, 30], [1, 3]);
			setLine(model, second, [20, 40], [2, 4]);
			expect(model.dataStore().length).to.equal(4);
			model.removeSeries(second);
			expect(model.dataStore().length).to.equal(2);
		});

		it('gives the range of the visible bars for autoscale', () => {
			const spec = Candlestick();
			const series = model.createSeries(spec.kind, seriesOptionsFromSpec(spec)) as unknown as Series;
			model.setSeriesData(series, new Float64Array([10, 20]) as SortedTimes, new Float64Array([5, 9, 4, 6, 6, 8, 2, 7]), false);
			const range = series.autoscaleRange(0 as TimePointIndex, 1 as TimePointIndex);
			expect(range?.min).to.equal(2);
			expect(range?.max).to.equal(9);
			expect(series.autoscaleRange(5 as TimePointIndex, 9 as TimePointIndex)).to.equal(null);
		});
	});

	it('the base index of the time scale follows the number of time points', () => {
		const series = addLine(model);
		setLine(model, series, [10, 20, 30], [1, 2, 3]);
		expect(model.timeScale().baseIndex()).to.equal(2);

		setLine(model, series, [], []);
		expect(model.timeScale().baseIndex()).to.equal(0);
	});

	describe('crosshair', () => {
		it('is calculated one time for each frame, from the last pointer position', () => {
			const series = addLine(model);
			setLine(model, series, [10, 20, 30], [1, 2, 3]);
			invalidations.length = 0;

			model.setCrosshairPosition(10, 10, model.panes()[0]);
			model.setCrosshairPosition(97, 50, model.panes()[0]);
			expect(invalidations.every((level: InvalidationLevel) => level === InvalidationLevel.Cursor)).to.equal(true);

			expect(model.resolveCrosshair()).to.equal(true);
			const crosshair = model.crosshair();
			expect(crosshair.index).to.equal(2);
			expect(crosshair.x).to.equal(model.timeScale().indexToCoordinate(2 as TimePointIndex));
			expect(Number.isNaN(crosshair.price)).to.equal(false);

			// nothing changed: no new calculation
			expect(model.resolveCrosshair()).to.equal(false);
		});

		it('the magnet mode puts the horizontal line on the close price of the bar', () => {
			const series = addLine(model);
			setLine(model, series, [10, 20, 30], [1, 2, 3]);
			const pane = model.panes()[0];

			model.setCrosshairPosition(97, 50, pane);
			model.resolveCrosshair();
			expect(model.crosshair().price).to.equal(3);
			expect(model.crosshair().y).to.equal(pane.priceScale.priceToCoordinate(3, 1));

			model.applyOptions({ crosshair: { mode: CrosshairMode.Normal } });
			model.setCrosshairPosition(97, 50, pane);
			model.resolveCrosshair();
			expect(model.crosshair().y).to.be.closeTo(50, 1e-9);
		});

		it('is calculated again after a scale change', () => {
			const series = addLine(model);
			setLine(model, series, [10, 20, 30], [1, 2, 3]);
			model.setCrosshairPosition(97, 50, model.panes()[0]);
			model.resolveCrosshair();

			model.updateSeriesData(series, 40, 4, 0, 0, 0);
			expect(model.resolveCrosshair()).to.equal(true);
			expect(model.crosshair().index).to.equal(3);
		});

		it('has no time index when the chart has no data', () => {
			model.clearCrosshairPosition();
			model.resolveCrosshair();
			expect(model.crosshair().index).to.equal(null);
		});

		it('clears to the last time point with no pane', () => {
			const series = addLine(model);
			setLine(model, series, [10, 20, 30], [1, 2, 3]);
			model.setCrosshairPosition(10, 10, model.panes()[0]);
			model.resolveCrosshair();

			model.clearCrosshairPosition();
			expect(model.resolveCrosshair()).to.equal(true);
			const crosshair = model.crosshair();
			expect(crosshair.pane).to.equal(null);
			expect(crosshair.index).to.equal(2);
		});
	});

	describe('requests', () => {
		it('a price scale with no range gets one autoscale, also when autoscale is off', () => {
			const pane = model.panes()[0];
			pane.priceScale.setAutoScale(false);
			const series = addLine(model);
			setLine(model, series, [10, 20, 30], [1, 2, 3]);
			expect(pane.priceScale.priceRange()).to.deep.equal({ min: 1, max: 3 });

			// the scale keeps a range that it has
			pane.priceScale.setPriceRange({ min: 100, max: 200 });
			setLine(model, series, [10, 20, 30], [4, 5, 6]);
			expect(pane.priceScale.priceRange()).to.deep.equal({ min: 100, max: 200 });
		});

		it('fitContent shows all time points in the next frame', () => {
			const series = addLine(model);
			setLine(model, series, [10, 20, 30, 40, 50], [1, 2, 3, 4, 5]);
			model.timeScale().setBarSpacing(50);
			invalidations.length = 0;

			model.fitContent();
			expect(invalidations.pop()).to.equal(InvalidationLevel.Light);
			expect(model.timeScale().barSpacing()).to.equal(50);

			model.applyRequests();
			expect(model.timeScale().barSpacing()).to.equal(20);
			expect(model.timeScale().visibleBars()).to.deep.equal({ first: 0, last: 4 });
		});

		it('the last request for the time range is the one that is applied', () => {
			const series = addLine(model);
			setLine(model, series, [10, 20, 30, 40, 50], [1, 2, 3, 4, 5]);

			model.fitContent();
			model.setTargetTimeRange({ from: 20, to: 30 });
			model.applyRequests();
			expect(model.timeScale().visibleBars()).to.deep.equal({ first: 1, last: 2 });
		});
	});
});
