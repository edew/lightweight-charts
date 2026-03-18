import type { Binding as CanvasCoordinateSpaceBinding } from 'fancy-canvas/coordinate-space';

import { clearRect, drawScaled } from '../helpers/canvas-helpers';
import type { IDestroyable } from '../helpers/idestroyable';

import type { ChartOptionsInternal } from '../model/chart-model';
import { InvalidationLevel } from '../model/invalidate-mask';
import { PriceAxisRendererOptionsProvider } from '../renderers/price-axis-renderer-options-provider';

import { createBoundCanvas, getContext2D, Size } from './canvas-utils';
import type { PriceAxisWidgetSide } from './price-axis-widget';

export interface PriceAxisStubParams {
	rendererOptionsProvider: PriceAxisRendererOptionsProvider;
}

export type BorderVisibleGetter = () => boolean;

export class PriceAxisStub implements IDestroyable {
	readonly #cell: HTMLDivElement;
	readonly #canvasBinding: CanvasCoordinateSpaceBinding;

	readonly #rendererOptionsProvider: PriceAxisRendererOptionsProvider;

	#options: ChartOptionsInternal;

	#invalidated: boolean = true;

	readonly #isLeft: boolean;
	#size: Size = new Size(0, 0);
	readonly #borderVisible: BorderVisibleGetter;

	public constructor(
		side: PriceAxisWidgetSide,
		options: ChartOptionsInternal,
		params: PriceAxisStubParams,
		borderVisible: BorderVisibleGetter
	) {
		this.#isLeft = side === 'left';
		this.#rendererOptionsProvider = params.rendererOptionsProvider;

		this.#options = options;
		this.#borderVisible = borderVisible;

		this.#cell = document.createElement('div');
		this.#cell.style.width = '25px';
		this.#cell.style.height = '100%';
		this.#cell.style.overflow = 'hidden';

		this.#canvasBinding = createBoundCanvas(this.#cell, new Size(16, 16));
		this.#canvasBinding.subscribeCanvasConfigured(this.#canvasConfiguredHandler);
	}

	public destroy(): void {
		this.#canvasBinding.unsubscribeCanvasConfigured(this.#canvasConfiguredHandler);
		this.#canvasBinding.destroy();
	}

	public update(): void {
		this.#invalidated = true;
	}

	public getElement(): HTMLElement {
		return this.#cell;
	}

	public getSize(): Readonly<Size> {
		return this.#size;
	}

	public setSize(size: Size): void {
		if (size.w < 0 || size.h < 0) {
			throw new Error('Try to set invalid size to PriceAxisStub ' + JSON.stringify(size));
		}

		if (!this.#size.equals(size)) {
			this.#size = size;

			this.#canvasBinding.resizeCanvas({ width: size.w, height: size.h });

			this.#cell.style.width = `${size.w}px`;
			this.#cell.style.minWidth = `${size.w}px`; // for right calculate position of .pane-legend
			this.#cell.style.height = `${size.h}px`;

			this.#invalidated = true;
		}
	}

	public paint(type: InvalidationLevel): void {
		if (type < InvalidationLevel.Full && !this.#invalidated) {
			return;
		}

		if (this.#size.w === 0 || this.#size.h === 0) {
			return;
		}

		this.#invalidated = false;

		const ctx = getContext2D(this.#canvasBinding.canvas);
		this.#drawBackground(ctx, this.#canvasBinding.pixelRatio);
		this.#drawBorder(ctx, this.#canvasBinding.pixelRatio);
	}

	public getImage(): HTMLCanvasElement {
		return this.#canvasBinding.canvas;
	}

	public isLeft(): boolean {
		return this.#isLeft;
	}

	#drawBorder(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (!this.#borderVisible()) {
			return;
		}
		const width = this.#size.w;

		ctx.save();

		ctx.fillStyle = this.#options.timeScale.borderColor;

		const borderSize = Math.floor(this.#rendererOptionsProvider.options().borderSize * pixelRatio);

		const left = (this.#isLeft) ? Math.round(width * pixelRatio) - borderSize : 0;

		ctx.fillRect(left, 0, borderSize, borderSize);
		ctx.restore();
	}

	#drawBackground(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		drawScaled(ctx, pixelRatio, () => {
			clearRect(ctx, 0, 0, this.#size.w, this.#size.h, this.#options.layout.backgroundColor);
		});
	}

	readonly #canvasConfiguredHandler = () => this.paint(InvalidationLevel.Full);
}
