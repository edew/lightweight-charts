import { drawHorizontalLine, drawVerticalLine, LineStyle, type LineWidth, setLineStyle } from './draw-line';
import type { IPaneRenderer } from './ipane-renderer';

export interface CrosshairLineStyle {
	lineStyle: LineStyle;
	lineWidth: LineWidth;
	color: string;
	visible: boolean;
}

export interface CrosshairRendererData {
	vertLine: CrosshairLineStyle;
	horzLine: CrosshairLineStyle;
	x: number;
	y: number;
	w: number;
	h: number;
}

export class CrosshairRenderer implements IPaneRenderer {
	readonly #data: CrosshairRendererData | null;

	public constructor(data: CrosshairRendererData | null) {
		this.#data = data;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void {
		if (this.#data === null) {
			return;
		}

		const vertLinesVisible = this.#data.vertLine.visible;
		const horzLinesVisible = this.#data.horzLine.visible;

		if (!vertLinesVisible && !horzLinesVisible) {
			return;
		}

		ctx.save();

		const x = Math.round(this.#data.x * pixelRatio);
		const y = Math.round(this.#data.y * pixelRatio);
		const w = Math.ceil(this.#data.w * pixelRatio);
		const h = Math.ceil(this.#data.h * pixelRatio);

		ctx.lineCap = 'butt';

		if (vertLinesVisible && x >= 0) {
			ctx.lineWidth = Math.floor(this.#data.vertLine.lineWidth * pixelRatio);
			ctx.strokeStyle = this.#data.vertLine.color;
			ctx.fillStyle = this.#data.vertLine.color;
			setLineStyle(ctx, this.#data.vertLine.lineStyle);
			drawVerticalLine(ctx, x, 0, h);
		}

		if (horzLinesVisible && y >= 0) {
			ctx.lineWidth = Math.floor(this.#data.horzLine.lineWidth * pixelRatio);
			ctx.strokeStyle = this.#data.horzLine.color;
			ctx.fillStyle = this.#data.horzLine.color;
			setLineStyle(ctx, this.#data.horzLine.lineStyle);
			drawHorizontalLine(ctx, y, 0, w);
		}

		ctx.restore();
	}
}
