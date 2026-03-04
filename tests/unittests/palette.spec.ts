import { expect } from 'chai';
import { describe, it, beforeEach } from 'vitest';

import { Palette } from '../../src/model/palette';

describe('Palette', () => {
	let palette: Palette;

	beforeEach(() => {
		palette = new Palette();
	});

	it('should add a color and return an index', () => {
		const index = palette.addColor('#FF0000');
		expect(index).to.equal(0);
	});

	it('should return the same index for the same color', () => {
		const index1 = palette.addColor('#FF0000');
		const index2 = palette.addColor('#FF0000');
		expect(index1).to.equal(index2);
	});

	it('should assign sequential indices to different colors', () => {
		const red = palette.addColor('#FF0000');
		const green = palette.addColor('#00FF00');
		const blue = palette.addColor('#0000FF');

		expect(red).to.equal(0);
		expect(green).to.equal(1);
		expect(blue).to.equal(2);
	});

	it('should retrieve color by index', () => {
		const idx = palette.addColor('#ABCDEF');
		const color = palette.colorByIndex(idx);
		expect(color).to.equal('#ABCDEF');
	});

	it('should handle multiple colors and retrieve them correctly', () => {
		const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
		const indices = colors.map(c => palette.addColor(c));

		colors.forEach((color, i) => {
			expect(palette.colorByIndex(indices[i])).to.equal(color);
		});
	});

	it('should report correct size', () => {
		expect(palette.size()).to.equal(0);
		palette.addColor('#FF0000');
		expect(palette.size()).to.equal(1);
		palette.addColor('#00FF00');
		expect(palette.size()).to.equal(2);
	});

	it('should not increase size when adding duplicate color', () => {
		palette.addColor('#FF0000');
		expect(palette.size()).to.equal(1);
		palette.addColor('#FF0000');
		expect(palette.size()).to.equal(1);
	});

	it('should clear all colors', () => {
		palette.addColor('#FF0000');
		palette.addColor('#00FF00');
		palette.addColor('#0000FF');
		expect(palette.size()).to.equal(3);

		palette.clear();
		expect(palette.size()).to.equal(0);
	});

	it('should reassign indices after clear', () => {
		const idx1 = palette.addColor('#FF0000');
		palette.clear();
		const idx2 = palette.addColor('#FF0000');

		expect(idx1).to.equal(0);
		expect(idx2).to.equal(0);
	});

	it('should handle colorByIndex on cleared palette', () => {
		palette.addColor('#FF0000');
		palette.clear();

		expect(() => {
			palette.colorByIndex(0);
		}).to.throw();
	});

	it('should handle many colors efficiently', () => {
		const colorCount = 1000;
		for (let i = 0; i < colorCount; i++) {
			palette.addColor(`#${String(i).padStart(6, '0')}`);
		}

		expect(palette.size()).to.equal(colorCount);
		expect(palette.colorByIndex(500)).to.equal('#000500');
	});
});
