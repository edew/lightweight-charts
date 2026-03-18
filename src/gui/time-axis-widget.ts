import type { Binding as CanvasCoordinateSpaceBinding } from 'fancy-canvas/coordinate-space';

import { clearRect, drawScaled } from '../helpers/canvas-helpers';
import type { IDestroyable } from '../helpers/idestroyable';
import { makeFont } from '../helpers/make-font';

import type { Coordinate } from '../model/coordinate';
import type { IDataSource } from '../model/data-source/idata-source';
import { InvalidationLevel } from '../model/invalidate-mask';
import type { LayoutOptions } from '../model/layout-options';
import type { PriceAxisPosition } from '../model/price-scale/price-scale';
import { TextWidthCache } from '../model/text-width-cache';
import { MarkSpanBorder, type TimeMark } from '../model/time-scale/time-scale';
import type { TimeAxisViewRendererOptions } from '../renderers/itime-axis-view-renderer';
import { TimeAxisView } from '../views/time-axis/time-axis-view';

import { createBoundCanvas, getContext2D, Size } from './canvas-utils';
import { ChartWidget } from './chart-widget';
import { MouseEventHandler, type MouseEventHandlers, type TouchMouseEvent } from './mouse-event-handler';
import { PriceAxisStub, type PriceAxisStubParams } from './price-axis-stub';

const enum Constants {
	BorderSize = 1,
	TickLength = 3,
}

const enum CursorType {
	Default,
	EwResize,
}

function markWithGreaterSpan(a: TimeMark, b: TimeMark): TimeMark {
	return a.span > b.span ? a : b;
}

export class TimeAxisWidget implements MouseEventHandlers, IDestroyable {
	readonly #chart: ChartWidget;
	readonly #options: LayoutOptions;
	readonly #element: HTMLElement;
	readonly #leftStubCell: HTMLElement;
	readonly #rightStubCell: HTMLElement;
	readonly #cell: HTMLElement;
	readonly #dv: HTMLElement;
	readonly #canvasBinding: CanvasCoordinateSpaceBinding;
	readonly #topCanvasBinding: CanvasCoordinateSpaceBinding;
	#stub: PriceAxisStub | null = null;
	#minVisibleSpan: number = MarkSpanBorder.Year;
	readonly #mouseEventHandler: MouseEventHandler;
	#rendererOptions: TimeAxisViewRendererOptions | null = null;
	#mouseDown: boolean = false;
	#size: Size = new Size(0, 0);
	#priceAxisPosition: PriceAxisPosition = 'none';

	public constructor(chartWidget: ChartWidget) {
		this.#chart = chartWidget;
		this.#options = chartWidget.options().layout;

		this.#element = document.createElement('tr');

		this.#leftStubCell = document.createElement('td');
		this.#leftStubCell.style.padding = '0';

		this.#rightStubCell = document.createElement('td');
		this.#rightStubCell.style.padding = '0';

		this.#cell = document.createElement('td');
		this.#cell.style.height = '25px';
		this.#cell.style.padding = '0';

		this.#dv = document.createElement('div');
		this.#dv.style.width = '100%';
		this.#dv.style.height = '100%';
		this.#dv.style.position = 'relative';
		this.#dv.style.overflow = 'hidden';
		this.#cell.appendChild(this.#dv);

		this.#canvasBinding = createBoundCanvas(this.#dv, new Size(16, 16));
		this.#canvasBinding.subscribeCanvasConfigured(this.#canvasConfiguredHandler);
		const canvas = this.#canvasBinding.canvas;
		canvas.style.position = 'absolute';
		canvas.style.zIndex = '1';
		canvas.style.left = '0';
		canvas.style.top = '0';

		this.#topCanvasBinding = createBoundCanvas(this.#dv, new Size(16, 16));
		this.#topCanvasBinding.subscribeCanvasConfigured(this.#topCanvasConfiguredHandler);
		const topCanvas = this.#topCanvasBinding.canvas;
		topCanvas.style.position = 'absolute';
		topCanvas.style.zIndex = '2';
		topCanvas.style.left = '0';
		topCanvas.style.top = '0';

		this.#element.appendChild(this.#leftStubCell);
		this.#element.appendChild(this.#cell);
		this.#element.appendChild(this.#rightStubCell);

		this.#recreateStub();
		this.#chart.model().mainPriceScaleOptionsChanged().subscribe(this.#recreateStub.bind(this), this);

		this.#mouseEventHandler = new MouseEventHandler(
			this.#topCanvasBinding.canvas,
			this,
			{
				treatVertTouchDragAsPageScroll: true,
				treatHorzTouchDragAsPageScroll: false,
			}
		);
	}

	public destroy(): void {
		this.#mouseEventHandler.destroy();
		if (this.#stub !== null) {
			this.#stub.destroy();
		}

		this.#topCanvasBinding.unsubscribeCanvasConfigured(this.#topCanvasConfiguredHandler);
		this.#topCanvasBinding.destroy();

		this.#canvasBinding.unsubscribeCanvasConfigured(this.#canvasConfiguredHandler);
		this.#canvasBinding.destroy();
	}

	public getElement(): HTMLElement {
		return this.#element;
	}

	public stub(): PriceAxisStub | null {
		return this.#stub;
	}

	public mouseDownEvent(event: TouchMouseEvent): void {
		if (this.#mouseDown) {
			return;
		}

		this.#mouseDown = true;
		const model = this.#chart.model();
		if (model.timeScale().isEmpty() || !this.#chart.options().handleScale.axisPressedMouseMove) {
			return;
		}

		model.startScaleTime(event.localX as Coordinate);
	}

	public mouseDownOutsideEvent(): void {
		const model = this.#chart.model();
		if (!model.timeScale().isEmpty() && this.#mouseDown) {
			this.#mouseDown = false;
			if (this.#chart.options().handleScale.axisPressedMouseMove) {
				model.endScaleTime();
			}
		}
	}

	public pressedMouseMoveEvent(event: TouchMouseEvent): void {
		const model = this.#chart.model();
		if (model.timeScale().isEmpty() || !this.#chart.options().handleScale.axisPressedMouseMove) {
			return;
		}

		model.scaleTimeTo(event.localX as Coordinate);
	}

	public mouseUpEvent(event: TouchMouseEvent): void {
		this.#mouseDown = false;
		const model = this.#chart.model();
		if (model.timeScale().isEmpty() && !this.#chart.options().handleScale.axisPressedMouseMove) {
			return;
		}

		model.endScaleTime();
	}

	public mouseDoubleClickEvent(): void {
		if (this.#chart.options().handleScale.axisDoubleClickReset) {
			this.#chart.model().resetTimeScale();
		}
	}

	public mouseEnterEvent(e: TouchMouseEvent): void {
		if (this.#chart.model().options().handleScale.axisPressedMouseMove) {
			this.#setCursor(CursorType.EwResize);
		}
	}

	public mouseLeaveEvent(e: TouchMouseEvent): void {
		this.#setCursor(CursorType.Default);
	}

	public getSize(): Readonly<Size> {
		return this.#size;
	}

	public setSizes(timeAxisSize: Size, stubWidth: number): void {
		if (!this.#size || !this.#size.equals(timeAxisSize)) {
			this.#size = timeAxisSize;

			this.#canvasBinding.resizeCanvas({ width: timeAxisSize.w, height: timeAxisSize.h });
			this.#topCanvasBinding.resizeCanvas({ width: timeAxisSize.w, height: timeAxisSize.h });

			this.#cell.style.width = timeAxisSize.w + 'px';
			this.#cell.style.height = timeAxisSize.h + 'px';
		}

		if (this.#stub !== null) {
			this.#stub.setSize(new Size(stubWidth, timeAxisSize.h));
		}
	}

	public width(): number {
		return this.#size.w;
	}

	public height(): number {
		return this.#size.h;
	}

	public optimalHeight(): number {
		const rendererOptions = this.#getRendererOptions();
		return Math.ceil(
			// rendererOptions.offsetSize +
			rendererOptions.borderSize +
			rendererOptions.tickLength +
			rendererOptions.fontSize +
			rendererOptions.paddingTop +
			rendererOptions.paddingBottom
		);
	}

	public update(): void {
		const tickMarks = this.#chart.model().timeScale().marks();

		if (!tickMarks) {
			return;
		}

		this.#minVisibleSpan = MarkSpanBorder.Year;

		tickMarks.forEach((tickMark: TimeMark) => {
			this.#minVisibleSpan = Math.min(tickMark.span, this.#minVisibleSpan);
		});
	}

	public getImage(): HTMLCanvasElement {
		return this.#canvasBinding.canvas;
	}

	public paint(type: InvalidationLevel): void {
		if (type === InvalidationLevel.None) {
			return;
		}

		if (type !== InvalidationLevel.Cursor) {
			const ctx = getContext2D(this.#canvasBinding.canvas);
			this.#drawBackground(ctx, this.#canvasBinding.pixelRatio);
			this.#drawBorder(ctx, this.#canvasBinding.pixelRatio);

			this.#drawTickMarks(ctx, this.#canvasBinding.pixelRatio);
			this.#drawBackLabels(ctx, this.#canvasBinding.pixelRatio);

			if (this.#stub !== null) {
				this.#stub.paint(type);
			}
		}

		const topCtx = getContext2D(this.#topCanvasBinding.canvas);
		this.#drawCrosshairLabel(topCtx, this.#topCanvasBinding.pixelRatio);
	}

	#drawBackground(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		drawScaled(ctx, pixelRatio, () => {
			clearRect(ctx, 0, 0, this.#size.w, this.#size.h, this.#backgroundColor());
		});
	}

	#drawBorder(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (this.#chart.options().timeScale.borderVisible) {
			ctx.save();

			ctx.fillStyle = this.#lineColor();

			const borderSize = Math.max(1, Math.floor(this.#getRendererOptions().borderSize * pixelRatio));

			ctx.fillRect(0, 0, Math.ceil(this.#size.w * pixelRatio), borderSize);
			ctx.restore();
		}
	}

	#drawTickMarks(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		const tickMarks = this.#chart.model().timeScale().marks();

		if (!tickMarks || tickMarks.length === 0) {
			return;
		}

		// select max span
		/*
		5 * ?SEC -> 11;
		15 * ?SEC -> 12;
		30 * ?SEC -> 13;
		?MIN -> 20;
		5 * ?MIN -> 21;
		15 * ?MIN -> 21;
		30 * ?MIN -> 22;
		?HOUR -> 30;
		3 * ?HOUR -> 31;
		6 * ?HOUR -> 32;
		12 * ?HOUR -> 33;
		?DAY -> 40;
		?WEEK -> 50;
		?MONTH -> 60;
		?YEAR -> 70
		*/

		let maxSpan = tickMarks.reduce(markWithGreaterSpan, tickMarks[0]).span;

		// special case: it looks strange if 15:00 is bold but 14:00 is not
		// so if maxSpan > 30 and < 40 reduce it to 30
		if (maxSpan > 30 && maxSpan < 40) {
			maxSpan = 30;
		}

		ctx.save();

		ctx.strokeStyle = this.#lineColor();

		const rendererOptions = this.#getRendererOptions();
		const yText = (
			rendererOptions.borderSize +
			rendererOptions.tickLength +
			rendererOptions.paddingTop +
			rendererOptions.fontSize -
			rendererOptions.baselineOffset
		);

		ctx.textAlign = 'center';
		ctx.fillStyle = this.#lineColor();

		const borderSize = Math.floor(this.#getRendererOptions().borderSize * pixelRatio);
		const tickWidth = Math.max(1, Math.floor(pixelRatio));
		const tickOffset = Math.floor(pixelRatio * 0.5);

		if (this.#chart.model().timeScale().options().borderVisible) {
			ctx.beginPath();
			const tickLen = Math.round(rendererOptions.tickLength * pixelRatio);
			for (let index = tickMarks.length; index--;) {
				const x = Math.round(tickMarks[index].coord * pixelRatio);
				ctx.rect(x - tickOffset, borderSize, tickWidth, tickLen);
			}

			ctx.fill();
		}

		ctx.fillStyle = this.#textColor();

		drawScaled(ctx, pixelRatio, () => {
			// draw base marks
			ctx.font = this.#baseFont();
			for (const tickMark of tickMarks) {
				if (tickMark.span < maxSpan) {
					ctx.fillText(tickMark.label, tickMark.coord, yText);
				}
			}
			ctx.font = this.#baseBoldFont();
			for (const tickMark of tickMarks) {
				if (tickMark.span >= maxSpan) {
					ctx.fillText(tickMark.label, tickMark.coord, yText);
				}
			}
		});
	}

	#drawBackLabels(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		ctx.save();
		const topLevelSources: Set<IDataSource> = new Set();

		const model = this.#chart.model();
		const sources = model.dataSources();
		topLevelSources.add(model.crosshairSource());

		const rendererOptions = this.#getRendererOptions();
		for (const source of sources) {
			if (topLevelSources.has(source)) {
				continue;
			}

			const views = source.timeAxisViews();
			for (const view of views) {
				view.renderer().draw(ctx, rendererOptions, pixelRatio);
			}
		}

		ctx.restore();
	}

	#drawCrosshairLabel(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		ctx.save();

		ctx.clearRect(0, 0, Math.ceil(this.#size.w * pixelRatio), Math.ceil(this.#size.h * pixelRatio));
		const model = this.#chart.model();

		const views: ReadonlyArray<TimeAxisView>[] = []; // array of arrays

		const timeAxisViews = model.crosshairSource().timeAxisViews();
		views.push(timeAxisViews);

		const renderingOptions = this.#getRendererOptions();

		views.forEach((arr: ReadonlyArray<TimeAxisView>) => {
			arr.forEach((view: TimeAxisView) => {
				ctx.save();
				view.renderer().draw(ctx, renderingOptions, pixelRatio);
				ctx.restore();
			});
		});

		ctx.restore();
	}

	#backgroundColor(): string {
		return this.#options.backgroundColor;
	}

	#lineColor(): string {
		return this.#chart.options().timeScale.borderColor;
	}

	#textColor(): string {
		return this.#options.textColor;
	}

	#fontSize(): number {
		return this.#options.fontSize;
	}

	#baseFont(): string {
		return makeFont(this.#fontSize(), this.#options.fontFamily);
	}

	#baseBoldFont(): string {
		return makeFont(this.#fontSize(), this.#options.fontFamily, 'bold');
	}

	#getRendererOptions(): Readonly<TimeAxisViewRendererOptions> {
		if (this.#rendererOptions === null) {
			this.#rendererOptions = {
				borderSize: Constants.BorderSize,
				baselineOffset: NaN,
				paddingTop: NaN,
				paddingBottom: NaN,
				paddingHorizontal: NaN,
				tickLength: Constants.TickLength,
				fontSize: NaN,
				font: '',
				widthCache: new TextWidthCache(),
			};
		}

		const rendererOptions = this.#rendererOptions;
		const newFont = this.#baseFont();

		if (rendererOptions.font !== newFont) {
			const fontSize = this.#fontSize();
			rendererOptions.fontSize = fontSize;
			rendererOptions.font = newFont;
			rendererOptions.paddingTop = Math.ceil(fontSize / 2.5);
			rendererOptions.paddingBottom = rendererOptions.paddingTop;
			rendererOptions.paddingHorizontal = Math.ceil(fontSize / 2);
			rendererOptions.baselineOffset = Math.round(this.#fontSize() / 5);
			rendererOptions.widthCache.reset();
		}

		return this.#rendererOptions;
	}

	#setCursor(type: CursorType): void {
		this.#cell.style.cursor = type === CursorType.EwResize ? 'ew-resize' : 'default';
	}

	#recreateStub(): void {
		const priceAxisPosition = this.#chart.model().mainPriceScale().options().position;
		if (priceAxisPosition === this.#priceAxisPosition) {
			return;
		}
		if (this.#stub !== null) {
			if (this.#stub.isLeft()) {
				this.#leftStubCell.removeChild(this.#stub.getElement());
			} else {
				this.#rightStubCell.removeChild(this.#stub.getElement());
			}

			this.#stub.destroy();
			this.#stub = null;
		}

		if (priceAxisPosition !== 'none') {
			const rendererOptionsProvider = this.#chart.model().rendererOptionsProvider();
			const params: PriceAxisStubParams = {
				rendererOptionsProvider: rendererOptionsProvider,
			};

			const model = this.#chart.model();
			const borderVisibleGetter = () => {
				return model.mainPriceScale().options().borderVisible && model.timeScale().options().borderVisible;
			};

			this.#stub = new PriceAxisStub(priceAxisPosition, this.#chart.options(), params, borderVisibleGetter);
			const stubCell = priceAxisPosition === 'left' ? this.#leftStubCell : this.#rightStubCell;
			stubCell.appendChild(this.#stub.getElement());
		}

		this.#priceAxisPosition = priceAxisPosition;
	}

	readonly #canvasConfiguredHandler = () => this.#chart.model().lightUpdate();
	readonly #topCanvasConfiguredHandler = () => this.#chart.model().lightUpdate();
}
