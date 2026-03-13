import type { Nominal } from './nominal';
import { isNaN } from './strict-type-checks';

/**
 * Red component of the RGB color value
 * The valid values are integers in range [0, 255]
 */
export type RedComponent = Nominal<number, 'RedComponent'>;

/**
 * Green component of the RGB color value
 * The valid values are integers in range [0, 255]
 */
export type GreenComponent = Nominal<number, 'GreenComponent'>;

/**
 * Blue component of the RGB color value
 * The valid values are integers in range [0, 255]
 */
export type BlueComponent = Nominal<number, 'BlueComponent'>;

/**
 * Alpha component of the RGBA color value
 * The valid values are integers in range [0, 1]
 */
type AlphaComponent = Nominal<number, 'AlphaComponent'>;

export type Rgb = [RedComponent, GreenComponent, BlueComponent];
type Rgba = [RedComponent, GreenComponent, BlueComponent, AlphaComponent];

function normalizeInteger(min: number, n: number, max: number): number {
	return (
		isNaN(n) ? min :
			n < min ? min :
			n > max ? max :
			Math.round(n)
	);
}

function normalizeNumber(min: number, n: number, max: number): number {
	return (
		isNaN(n) ? min :
			n < min ? min :
			n > max ? max :
			// limit the precision of all numbers to at most 4 digits in fractional part
			Math.round(n * 10000) / 10000
	);
}

function normalizeRgbComponent<T extends RedComponent | GreenComponent | BlueComponent>(component: number): T {
	return normalizeInteger(0, component, 255) as T;
}

function normalizeAlphaComponent(alpha: number): AlphaComponent {
	return normalizeNumber(0, alpha, 1) as AlphaComponent;
}

namespace RgbShortHexRepresentation {
	/**
	 * @example
	 * #fb0
	 * @example
	 * #f0f
	 */
	export const re = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
	export function parse(matches: RegExpExecArray): Rgb {
		return [
			normalizeRgbComponent<RedComponent>(parseInt(matches[1] + matches[1], 16)),
			normalizeRgbComponent<GreenComponent>(parseInt(matches[2] + matches[2], 16)),
			normalizeRgbComponent<BlueComponent>(parseInt(matches[3] + matches[3], 16)),
		];
	}
}

function tryParseRgbShortHexString(rgbShortHexString: string): Rgb | null {
	const matches = RgbShortHexRepresentation.re.exec(rgbShortHexString);
	return matches !== null ? RgbShortHexRepresentation.parse(matches) : null;
}

namespace RgbHexRepresentation {
	/**
	 * @example
	 * #00ff00
	 * @example
	 * #336699
	 */
	export const re = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
	export function parse(matches: RegExpExecArray): Rgb {
		return [
			normalizeRgbComponent<RedComponent>(parseInt(matches[1], 16)),
			normalizeRgbComponent<GreenComponent>(parseInt(matches[2], 16)),
			normalizeRgbComponent<BlueComponent>(parseInt(matches[3], 16)),
		];
	}
}

namespace RgbRepresentation {
	/**
	 * @example
	 * rgb(123, 234, 45)
	 * @example
	 * rgb(255,234,245)
	 */
	export const re = /^rgb\(\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*\)$/;
	export function parse(matches: RegExpExecArray): Rgb {
		return [
			normalizeRgbComponent<RedComponent>(parseInt(matches[1], 10)),
			normalizeRgbComponent<GreenComponent>(parseInt(matches[2], 10)),
			normalizeRgbComponent<BlueComponent>(parseInt(matches[3], 10)),
		];
	}
}

namespace RgbaRepresentation {
	/**
	 * @example
	 * rgba(123, 234, 45, 1)
	 * @example
	 * rgba(255,234,245,0.1)
	 */
	export const re = /^rgba\(\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?\d{1,10})\s*,\s*(-?[\d]{0,10}(?:\.\d+)?)\s*\)$/;
	export function parse(matches: RegExpExecArray): Rgba {
		return [
			normalizeRgbComponent<RedComponent>(parseInt(matches[1], 10)),
			normalizeRgbComponent<GreenComponent>(parseInt(matches[2], 10)),
			normalizeRgbComponent<BlueComponent>(parseInt(matches[3], 10)),
			normalizeAlphaComponent(parseFloat(matches[4])),
		];
	}
}

function tryParseRgbHexString(rgbHexString: string): Rgb | null {
	const matches = RgbHexRepresentation.re.exec(rgbHexString);
	return matches !== null ? RgbHexRepresentation.parse(matches) : null;
}

function tryParseRgbString(rgbString: string): Rgb | null {
	const matches = RgbRepresentation.re.exec(rgbString);
	return matches !== null ? RgbRepresentation.parse(matches) : null;
}

function tryParseRgbaString(rgbaString: string): Rgba | null {
	const matches = RgbaRepresentation.re.exec(rgbaString);
	return matches !== null ? RgbaRepresentation.parse(matches) : null;
}

function tryParseRgb(colorString: string): Rgb | null {
	colorString = colorString.toLowerCase();

	const rgbParseResult = tryParseRgbString(colorString);
	if (rgbParseResult !== null) {
		return rgbParseResult;
	}

	const rgbHexParseResult = tryParseRgbHexString(colorString);
	if (rgbHexParseResult !== null) {
		return rgbHexParseResult;
	}

	const rgbShortHexParseResult = tryParseRgbShortHexString(colorString);
	if (rgbShortHexParseResult !== null) {
		return rgbShortHexParseResult;
	}

	const rgbaParseResult = tryParseRgbaString(colorString);
	if (rgbaParseResult !== null) {
		return [rgbaParseResult[0], rgbaParseResult[1], rgbaParseResult[2]];
	}

	return null;
}

export function parseRgb(colorString: string): Rgb {
	const parseResult = tryParseRgb(colorString);

	if (parseResult !== null) {
		return parseResult;
	} else {
		throw new Error(`Passed color string ${colorString} does not match any of the known color representations`);
	}
}

function rgbToGrayscale(rgbValue: Rgb): number {
	// Originally, the NTSC RGB to YUV formula
	// perfected by @eugene-korobko's black magic
	const redComponentGrayscaleWeight = 0.199;
	const greenComponentGrayscaleWeight = 0.687;
	const blueComponentGrayscaleWeight = 0.114;

	return (
		redComponentGrayscaleWeight * rgbValue[0] +
		greenComponentGrayscaleWeight * rgbValue[1] +
		blueComponentGrayscaleWeight * rgbValue[2]
	);
}

export function rgbToBlackWhiteString(rgbValue: Rgb, threshold: number): 'black' | 'white' {
	if (threshold < 0 || threshold > 255) {
		throw new Error('invalid threshold value, valid values are [0, 255]');
	}

	return rgbToGrayscale(rgbValue) >= threshold ? 'white' : 'black';
}

function rgba(rgb: Rgb, alpha: number): Rgba {
	return [
		rgb[0],
		rgb[1],
		rgb[2],
		normalizeAlphaComponent(alpha),
	];
}

function rgbaToString(rgbaValue: Rgba): string {
	return `rgba(${rgbaValue[0]}, ${rgbaValue[1]}, ${rgbaValue[2]}, ${rgbaValue[3]})`;
}

export function resetTransparency(color: string): string {
	if (isHexColor(color)) {
		return color;
	}

	return rgbaToString(rgba(parseRgb(color), 1));
}

export function colorWithTransparency(color: string, transparency: number): string {
	return rgbaToString(rgba(parseRgb(color), transparency));
}

function isHexColor(color: string): boolean {
	return color.indexOf('#') === 0;
}

export function generateTextColor(color: string): string {
	const backColorBW = rgbToBlackWhiteString(parseRgb(color), 160);
	return backColorBW === 'black' ? 'white' : 'black';
}
