import type { Coordinate } from '../model/coordinate';

import { drawHorizontalLine, LineStyle, type LineWidth, setLineStyle } from './draw-line';
import type { IPaneRenderer } from './ipane-renderer';

export interface HorizontalLineRendererData {
	color: string;
	height: number;
	lineStyle: LineStyle;
	lineWidth: LineWidth;

	y: Coordinate;
	visible?: boolean;
	width: number;
}

export class HorizontalLineRenderer implements IPaneRenderer {
	#data: HorizontalLineRendererData | null = null;

	public setData(data: HorizontalLineRendererData): void {
		this.#data = data;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void {
		if (this.#data === null) {
			return;
		}

		if (this.#data.visible === false) {
			return;
		}

		const y = Math.round(this.#data.y * pixelRatio);

		if (y < 0 || y > Math.ceil(this.#data.height * pixelRatio)) {
			return;
		}

		const width = Math.ceil(this.#data.width * pixelRatio);
		ctx.lineCap = 'butt';
		ctx.strokeStyle = this.#data.color;
		ctx.lineWidth = Math.floor(this.#data.lineWidth * pixelRatio);
		setLineStyle(ctx, this.#data.lineStyle);
		drawHorizontalLine(ctx, y, 0, width);
	}
}
