import { drawScaled } from '../helpers/canvas-helpers';
import { resetTransparency } from '../helpers/color';

import { TextWidthCache } from '../model/text-width-cache';

import type {
	IPriceAxisViewRenderer,
	PriceAxisViewRendererCommonData,
	PriceAxisViewRendererData,
	PriceAxisViewRendererOptions,
} from './iprice-axis-view-renderer';

export class PriceAxisViewRenderer implements IPriceAxisViewRenderer {
	#data!: PriceAxisViewRendererData;
	#commonData!: PriceAxisViewRendererCommonData;

	public constructor(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData) {
		this.setData(data, commonData);
	}

	public setData(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData): void {
		this.#data = data;
		this.#commonData = commonData;
	}

	public draw(
		ctx: CanvasRenderingContext2D,
		rendererOptions: PriceAxisViewRendererOptions,
		textWidthCache: TextWidthCache,
		width: number,
		align: 'left' | 'right',
		pixelRatio: number
	): void {
		if (!this.#data.visible) {
			return;
		}

		ctx.font = rendererOptions.font;

		const tickSize = this.#data.tickVisible ? rendererOptions.tickLength : 0;
		const horzBorder = rendererOptions.borderSize;
		const paddingTop = rendererOptions.paddingTop;
		const paddingBottom = rendererOptions.paddingBottom;
		const paddingInner = rendererOptions.paddingInner;
		const paddingOuter = rendererOptions.paddingOuter;
		const text = this.#data.text;
		const textWidth = Math.ceil(textWidthCache.measureText(ctx, text));
		const baselineOffset = rendererOptions.baselineOffset;
		const totalHeight = rendererOptions.fontSize + paddingTop + paddingBottom;
		const halfHeigth = Math.ceil(totalHeight * 0.5);
		const totalWidth = horzBorder + textWidth + paddingInner + paddingOuter + tickSize;

		let yMid = this.#commonData.coordinate;
		if (this.#commonData.fixedCoordinate) {
			yMid = this.#commonData.fixedCoordinate;
		}

		yMid = Math.round(yMid);

		const yTop = yMid - halfHeigth;
		const yBottom = yTop + totalHeight;

		const alignRight = align === 'right';

		const xInside = alignRight ? width : 0;
		const rightScaled = Math.ceil(width * pixelRatio);

		let xOutside = xInside;
		let xTick: number;
		let xText: number;

		ctx.fillStyle = resetTransparency(this.#commonData.background);
		ctx.lineWidth = 1;
		ctx.lineCap = 'butt';

		if (text) {
			if (alignRight) {
				// 2               1
				//
				//              6  5
				//
				// 3               4
				xOutside = xInside - totalWidth;
				xTick = xInside - tickSize;
				xText = xOutside + paddingOuter;
			} else {
				// 1               2
				//
				// 6  5
				//
				// 4               3
				xOutside = xInside + totalWidth;
				xTick = xInside + tickSize;
				xText = xInside + horzBorder + tickSize + paddingInner;
			}

			const tickHeight = Math.max(1, Math.floor(pixelRatio));

			const horzBorderScaled = Math.max(1, Math.floor(horzBorder * pixelRatio));
			const xInsideScaled = alignRight ? rightScaled : 0;
			const yTopScaled = Math.round(yTop * pixelRatio);
			const xOutsideScaled = Math.round(xOutside * pixelRatio);
			const yMidScaled = Math.round(yMid * pixelRatio) - Math.floor(pixelRatio * 0.5);

			const yBottomScaled = yMidScaled + tickHeight + (yMidScaled - yTopScaled);
			const xTickScaled = Math.round(xTick * pixelRatio);

			ctx.save();

			ctx.beginPath();
			ctx.moveTo(xInsideScaled, yTopScaled);
			ctx.lineTo(xOutsideScaled, yTopScaled);
			ctx.lineTo(xOutsideScaled, yBottomScaled);
			ctx.lineTo(xInsideScaled, yBottomScaled);
			ctx.fill();

			// draw border
			ctx.fillStyle = this.#data.borderColor;
			ctx.fillRect(alignRight ? rightScaled - horzBorderScaled : 0, yTopScaled, horzBorderScaled, yBottomScaled - yTopScaled);

			if (this.#data.tickVisible) {
				ctx.fillStyle = this.#commonData.color;
				ctx.fillRect(xInsideScaled, yMidScaled, xTickScaled - xInsideScaled, tickHeight);
			}

			ctx.textAlign = 'left';
			ctx.fillStyle = this.#commonData.color;

			drawScaled(ctx, pixelRatio, () => {
				ctx.fillText(text, xText, yBottom - paddingBottom - baselineOffset);
			});

			ctx.restore();
		}
	}

	public height(rendererOptions: PriceAxisViewRendererOptions, useSecondLine: boolean): number {
		if (!this.#data.visible) {
			return 0;
		}

		return rendererOptions.fontSize + rendererOptions.paddingTop + rendererOptions.paddingBottom;
	}
}
