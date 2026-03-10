import { expect } from 'chai';
import { describe, it } from 'vitest';

import { type Bar, barFunction, SeriesData, SeriesPlotIndex } from '../../src/model/series-data';
import type { TimePoint, TimePointIndex } from '../../src/model/time-scale/time-data';

describe('series-data', () => {
	describe('barFunction', () => {
		const barValue: Bar['value'] = [10, 20, 5, 15, 0];

		it('should return open price', () => {
			expect(barFunction('open')(barValue)).to.equal(10);
		});

		it('should return high price', () => {
			expect(barFunction('high')(barValue)).to.equal(20);
		});

		it('should return low price', () => {
			expect(barFunction('low')(barValue)).to.equal(5);
		});

		it('should return close price', () => {
			expect(barFunction('close')(barValue)).to.equal(15);
		});

		it('should return hl2 price', () => {
			expect(barFunction('hl2')(barValue)).to.equal((20 + 5) / 2);
		});

		it('should return hlc3 price', () => {
			expect(barFunction('hlc3')(barValue)).to.equal((20 + 5 + 15) / 3);
		});

		it('should return ohlc4 price', () => {
			expect(barFunction('ohlc4')(barValue)).to.equal((10 + 20 + 5 + 15) / 4);
		});
	});

	describe('SeriesData', () => {
		it('should be empty initially', () => {
			const seriesData = new SeriesData();
			expect(seriesData.isEmpty()).to.be.true;
			expect(seriesData.size()).to.equal(0);
		});

		it('should delegate to plot list', () => {
			const seriesData = new SeriesData();
			
			seriesData.bars().merge([{
				index: 0 as TimePointIndex,
				time: { timestamp: 1000 } as TimePoint,
				value: [10, 20, 5, 15, 0],
			}]);

			expect(seriesData.isEmpty()).to.be.false;
			expect(seriesData.size()).to.equal(1);
			
			const first = seriesData.first();
			expect(first).to.not.be.null;
			expect(first?.value[SeriesPlotIndex.Close]).to.equal(15);

			const last = seriesData.last();
			expect(last).to.deep.equal(first);

			const searchResult = seriesData.search(0 as TimePointIndex);
			expect(searchResult).to.deep.equal(first);

			const valueAtResult = seriesData.valueAt(0 as TimePointIndex);
			expect(valueAtResult).to.not.be.null;

			let iteratedCount = 0;
			seriesData.each((index, bar) => {
				iteratedCount++;
				expect(index).to.equal(0);
				expect(bar.value[SeriesPlotIndex.Open]).to.equal(10);
				return false;
			});
			expect(iteratedCount).to.equal(1);

			seriesData.clear();
			expect(seriesData.isEmpty()).to.be.true;
		});
	});
});
