import { expect } from 'chai';
import { describe, it, beforeEach } from 'vitest';

import { clone, merge } from '../../src/helpers/strict-type-checks';
import { InvalidationLevel, InvalidateMask } from '../../src/model/invalidate-mask';
import { ChartModel } from '../../src/model/chart-model';
import type { ChartOptionsInternal } from '../../src/model/chart-model';
import { chartOptionsDefaults } from '../../src/api/options/chart-options-defaults';
import { lineStyleDefaults, seriesOptionsDefaults } from '../../src/api/options/series-options-defaults';
import type { IDataSource } from '../../src/model/data-source/idata-source';
import type { TimePointIndex, TimePoint, UTCTimestamp } from '../../src/model/time-scale/time-data';
import type { PlotRow } from '../../src/model/plot-data';
import type { LineSeriesOptions } from '../../src/model/series-options';

function createLineSeriesOptions(): LineSeriesOptions {
    return merge(clone(seriesOptionsDefaults), lineStyleDefaults) as LineSeriesOptions;
}

function createModel(): { model: ChartModel; invalidations: InvalidateMask[] } {
    const invalidations: InvalidateMask[] = [];
    const invalidator = (mask: InvalidateMask) => {
        invalidations.push(mask);
    };
    const options: ChartOptionsInternal = clone(chartOptionsDefaults) as ChartOptionsInternal;
    // make sizes non-zero to avoid empty time scale behavior
    options.width = 100;
    options.height = 100;
    return { model: new ChartModel(invalidator, options), invalidations };
}

describe('ChartModel', () => {
    let model: ChartModel;
    let invalidations: InvalidateMask[];

    beforeEach(() => {
        const result = createModel();
        model = result.model;
        invalidations = result.invalidations;
    });

    it('should create one pane and watermark on construction', () => {
        expect(model.panes().length).to.equal(1);
        expect(model.watermarkSource()).to.not.be.equal(null);
        // constructor creates a pane which triggers at least one invalidation
        expect(invalidations.length).to.be.greaterThan(0);
        const mask = invalidations[0];
        expect(mask.fullInvalidation()).to.be.oneOf([InvalidationLevel.Light, InvalidationLevel.Full]);
    });

    it('fullUpdate and lightUpdate call invalidator with correct level', () => {
        invalidations.length = 0;
        model.fullUpdate();
        expect(invalidations.pop()!.fullInvalidation()).to.equal(InvalidationLevel.Full);
        model.lightUpdate();
        expect(invalidations.pop()!.fullInvalidation()).to.equal(InvalidationLevel.Light);
    });

    it('applyOptions merges, fires main price scale change and invalidates', () => {
        let fired = false;
        model.mainPriceScaleOptionsChanged().subscribe(() => { fired = true; });
        invalidations.length = 0;
        model.applyOptions({ priceScale: { borderColor: '#ff0000' } });
        expect(fired).to.be.true;
        const mask = invalidations.pop()!;
        expect(mask.fullInvalidation()).to.equal(InvalidationLevel.Full);
        expect(model.options().priceScale.borderColor).to.equal('#ff0000');
    });

    it('setHoveredSource updates source and invalidates previous and new source', () => {
        const fakeSource: IDataSource = {
            priceScale: () => null,
            attached(): boolean { return false; },
            destroy(): void { },
            updateAllViews(): void { },
            setUpdater(): void { },
            subscribe(): void { },
            unsubscribeAll(): void { },
        } as unknown as IDataSource;
        // previous null -> set to source should trigger one invalidation
        invalidations.length = 0;
        model.setHoveredSource({ source: fakeSource });
        expect(invalidations.length).to.be.greaterThan(0);

        // setting to null should invalidate the previous source
        invalidations.length = 0;
        model.setHoveredSource(null);
        expect(invalidations.length).to.be.greaterThan(0);
    });

    it('setWidth updates width on model and time scale and invalidates', () => {
        invalidations.length = 0;
        model.setWidth(200);
        expect(model.width()).to.equal(200);
        expect(model.timeScale().width()).to.equal(200);
        expect(invalidations.pop()!.fullInvalidation()).to.equal(InvalidationLevel.Light);
    });

    it('createPane adds a pane at the end and invalidates with autoScale', () => {
        invalidations.length = 0;
        const before = model.panes().length;
        const pane = model.createPane();
        expect(model.panes().length).to.equal(before + 1);
        expect(pane).to.be.instanceOf(Object);
        const mask = invalidations.pop()!;
        expect(mask.fullInvalidation()).to.be.at.least(InvalidationLevel.Light);
    });

    it('scrollTimeTo returns true when movement exceeds threshold', () => {
        model.startScrollTime(0 as any);
        const res1 = model.scrollTimeTo(10 as any);
        expect(res1).to.be.false;
        const res2 = model.scrollTimeTo(25 as any);
        expect(res2).to.be.true;
    });

    it('setAndSaveCurrentPosition updates crosshair and fires moved event', () => {
        let called = false;
        model.crosshairMoved().subscribe((_idx, _coord) => { called = true; });
        const pane = model.panes()[0];
        model.setAndSaveCurrentPosition(10 as any, 20 as any, pane);
        expect(called).to.be.true;
        // crosshair applied index should be a number (default 0)
        expect(model.crosshairSource().appliedIndex()).to.be.a('number');
    });

    it('clearCurrentPosition clears crosshair and fires moved event', () => {
        let eventCount = 0;
        model.crosshairMoved().subscribe(() => { eventCount += 1; });
        model.clearCurrentPosition();
        expect(eventCount).to.equal(1);
        expect(model.crosshairSource().visible()).to.be.false;
    });

    it('paneForSource returns null for unknown source and correct pane after adding watermark', () => {
        const fakeSource: IDataSource = {
            priceScale: () => null,
            attached(): boolean { return false; },
            destroy(): void { },
            updateAllViews(): void { },
            setUpdater(): void { },
            subscribe(): void { },
            unsubscribeAll(): void { },
        } as unknown as IDataSource;
        expect(model.paneForSource(fakeSource)).to.equal(null);
        const wm = model.watermarkSource();
        expect(model.paneForSource(wm!)).to.equal(model.panes()[0]);
    });

    it('updateTimeScaleBaseIndex sets base index according to series data', () => {
        const series = model.createSeries('Line', createLineSeriesOptions());
        // manually inject a bar into the series data
        const plotRow: PlotRow<TimePoint, [number, number, number, number, number]> = {
            index: 5 as TimePointIndex,
            time: { timestamp: 1 as UTCTimestamp },
            value: [100, 100, 100, 100, 0],
        };
        series.updateData([plotRow]);
        expect(model.timeScale().baseIndex()).to.equal(0 as TimePointIndex);
        model.updateTimeScaleBaseIndex();
        // after update it should equal 5
        expect(model.timeScale().baseIndex()).to.equal(5 as TimePointIndex);
    });

    it('setPriceAutoScaleForAllMainSources toggles all main price scales to auto', () => {
        const series = model.createSeries('Line', createLineSeriesOptions());
        // before call the default mode is maybe autoScale=false
        series.priceScale().setMode({ autoScale: false });
        model.setPriceAutoScaleForAllMainSources();
        expect(series.priceScale().mode().autoScale).to.be.true;
    });

    it('createSeries and removeSeries manage series list and invalidations', () => {
        invalidations.length = 0;
        const s1 = model.createSeries('Line', createLineSeriesOptions());
        expect(model.serieses()).to.include(s1);
        expect(invalidations.pop()!.fullInvalidation()).to.be.oneOf([InvalidationLevel.Full, InvalidationLevel.Light]);

        const beforeInvalidationCount = invalidations.length;
        model.removeSeries(s1);
        expect(model.serieses()).to.not.include(s1);
        expect(invalidations.length).to.equal(beforeInvalidationCount);
    });

    it('fitContent and setTargetTimeRange produce appropriate masks', () => {
        invalidations.length = 0;
        model.fitContent();
        const m1 = invalidations.pop()!;
        expect(m1.getFitContent()).to.be.true;

        invalidations.length = 0;
        const range = {
            from: { timestamp: 0 as UTCTimestamp },
            to: { timestamp: 10 as UTCTimestamp },
        };
        model.setTargetTimeRange(range);
        const m2 = invalidations.pop()!;
        expect(m2.getTargetTimeRange()).to.deep.equal(range);
    });
});
