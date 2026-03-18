import type { Binding as CanvasCoordinateSpaceBinding } from 'fancy-canvas/coordinate-space';

import { ensureNotNull } from '../helpers/assertions';
import { clearRect, drawScaled } from '../helpers/canvas-helpers';
import type { IDestroyable } from '../helpers/idestroyable';
import { makeFont } from '../helpers/make-font';

import type { Coordinate } from '../model/coordinate';
import type { IDataSource } from '../model/data-source/idata-source';
import { InvalidationLevel } from '../model/invalidate-mask';
import type { LayoutOptions } from '../model/layout-options';
import type { PriceScalePosition } from '../model/pane';
import { PriceScale } from '../model/price-scale/price-scale';
import { TextWidthCache } from '../model/text-width-cache';
import type { PriceAxisViewRendererOptions } from '../renderers/iprice-axis-view-renderer';
import { PriceAxisRendererOptionsProvider } from '../renderers/price-axis-renderer-options-provider';
import type { IPriceAxisView } from '../views/price-axis/iprice-axis-view';

import { createBoundCanvas, getContext2D, Size } from './canvas-utils';
import { LabelsImageCache } from './labels-image-cache';
import { MouseEventHandler, type MouseEventHandlers, type TouchMouseEvent } from './mouse-event-handler';
import { PaneWidget } from './pane-widget';

export type PriceAxisWidgetSide = Exclude<PriceScalePosition, 'overlay'>;

const enum CursorType {
	Default,
	NsResize,
}

type IPriceAxisViewArray = ReadonlyArray<IPriceAxisView>;

export class PriceAxisWidget implements IDestroyable {
	readonly #pane: PaneWidget;
	readonly #options: LayoutOptions;
	readonly #rendererOptionsProvider: PriceAxisRendererOptionsProvider;
	readonly #isLeft: boolean;

	#priceScale: PriceScale | null = null;

	#size: Size | null = null;

	readonly #cell: HTMLDivElement;
	readonly #canvasBinding: CanvasCoordinateSpaceBinding;
	readonly #topCanvasBinding: CanvasCoordinateSpaceBinding;

	#updateTimeout: TimerId | null = null;
	#mouseEventHandler: MouseEventHandler;
	#mousedown: boolean = false;

	#isVisible: boolean = true;

	readonly #widthCache: TextWidthCache = new TextWidthCache(50);
	#tickMarksCache: LabelsImageCache = new LabelsImageCache(11, '#000');

	#color: string | null = null;
	#font: string | null = null;
	#prevOptimalWidth: number = 0;

	public constructor(pane: PaneWidget, options: LayoutOptions, rendererOptionsProvider: PriceAxisRendererOptionsProvider, side: PriceAxisWidgetSide) {
		this.#pane = pane;
		this.#options = options;
		this.#rendererOptionsProvider = rendererOptionsProvider;
		this.#isLeft = side === 'left';

		this.#cell = document.createElement('div');
		this.#cell.style.height = '100%';
		this.#cell.style.overflow = 'hidden';
		this.#cell.style.width = '25px';
		this.#cell.style.left = '0';
		this.#cell.style.position = 'relative';

		this.#canvasBinding = createBoundCanvas(this.#cell, new Size(16, 16));
		this.#canvasBinding.subscribeCanvasConfigured(this.#canvasConfiguredHandler);
		const canvas = this.#canvasBinding.canvas;
		canvas.style.position = 'absolute';
		canvas.style.zIndex = '1';
		canvas.style.left = '0';
		canvas.style.top = '0';

		this.#topCanvasBinding = createBoundCanvas(this.#cell, new Size(16, 16));
		this.#topCanvasBinding.subscribeCanvasConfigured(this.#topCanvasConfiguredHandler);
		const topCanvas = this.#topCanvasBinding.canvas;
		topCanvas.style.position = 'absolute';
		topCanvas.style.zIndex = '2';
		topCanvas.style.left = '0';
		topCanvas.style.top = '0';

		const handler: MouseEventHandlers = {
			mouseDownEvent: this.#mouseDownEvent.bind(this),
			pressedMouseMoveEvent: this.#pressedMouseMoveEvent.bind(this),
			mouseDownOutsideEvent: this.#mouseDownOutsideEvent.bind(this),
			mouseUpEvent: this.#mouseUpEvent.bind(this),
			mouseDoubleClickEvent: this.#mouseDoubleClickEvent.bind(this),
			mouseEnterEvent: this.#mouseEnterEvent.bind(this),
			mouseLeaveEvent: this.#mouseLeaveEvent.bind(this),
		};
		this.#mouseEventHandler = new MouseEventHandler(
			this.#topCanvasBinding.canvas,
			handler,
			{
				treatVertTouchDragAsPageScroll: false,
				treatHorzTouchDragAsPageScroll: true,
			}
		);
	}

	public destroy(): void {
		this.#mouseEventHandler.destroy();

		this.#topCanvasBinding.unsubscribeCanvasConfigured(this.#topCanvasConfiguredHandler);
		this.#topCanvasBinding.destroy();

		this.#canvasBinding.unsubscribeCanvasConfigured(this.#canvasConfiguredHandler);
		this.#canvasBinding.destroy();

		if (this.#priceScale !== null) {
			this.#priceScale.onMarksChanged().unsubscribeAll(this);
			this.#priceScale.optionsChanged().unsubscribeAll(this);
		}
		this.#priceScale = null;

		if (this.#updateTimeout !== null) {
			clearTimeout(this.#updateTimeout);
			this.#updateTimeout = null;
		}

		this.#tickMarksCache.destroy();
	}

	public getElement(): HTMLElement {
		return this.#cell;
	}

	public backgroundColor(): string {
		return this.#options.backgroundColor;
	}

	public lineColor(): string {
		return this.#pane.chart().options().priceScale.borderColor;
	}

	public textColor(): string {
		return this.#options.textColor;
	}

	public fontSize(): number {
		return this.#options.fontSize;
	}

	public baseFont(): string {
		return makeFont(this.fontSize(), this.#options.fontFamily);
	}

	public rendererOptions(): Readonly<PriceAxisViewRendererOptions> {
		const options = this.#rendererOptionsProvider.options();

		const isColorChanged = this.#color !== options.color;
		const isFontChanged = this.#font !== options.font;

		if (isColorChanged || isFontChanged) {
			this.#recreateTickMarksCache(options);
			this.#color = options.color;
		}

		if (isFontChanged) {
			this.#widthCache.reset();
			this.#font = options.font;
		}

		return options;
	}

	public optimalWidth(): number {
		if (!this.isVisible() || this.#priceScale === null) {
			return 0;
		}

		// need some reasonable value for scale while initialization
		let tickMarkMaxWidth = 34;
		const rendererOptions = this.rendererOptions();

		const ctx = getContext2D(this.#canvasBinding.canvas);
		const tickMarks = this.#priceScale.marks();

		ctx.font = this.baseFont();

		if (tickMarks.length > 0) {
			tickMarkMaxWidth = Math.max(
				this.#widthCache.measureText(ctx, tickMarks[0].label),
				this.#widthCache.measureText(ctx, tickMarks[tickMarks.length - 1].label)
			);
		}

		const views = this.#backLabels();
		for (let j = views.length; j--;) {
			const width = this.#widthCache.measureText(ctx, views[j].text());
			if (width > tickMarkMaxWidth) {
				tickMarkMaxWidth = width;
			}
		}

		let res = Math.ceil(
			rendererOptions.borderSize +
			rendererOptions.tickLength +
			rendererOptions.paddingInner +
			rendererOptions.paddingOuter +
			tickMarkMaxWidth
		);
		// make it even
		res += res % 2;
		return res;
	}

	public setSize(size: Size): void {
		if (size.w < 0 || size.h < 0) {
			throw new Error('Try to set invalid size to PriceAxisWidget ' + JSON.stringify(size));
		}
		if (this.#size === null || !this.#size.equals(size)) {
			this.#size = size;

			this.#canvasBinding.resizeCanvas({ width: size.w, height: size.h });
			this.#topCanvasBinding.resizeCanvas({ width: size.w, height: size.h });

			this.#cell.style.width = size.w + 'px';
			// need this for IE11
			this.#cell.style.height = size.h + 'px';
			this.#cell.style.minWidth = size.w + 'px'; // for right calculate position of .pane-legend
		}
	}

	public getWidth(): number {
		return ensureNotNull(this.#size).w;
	}

	public setPriceScale(priceScale: PriceScale): void {
		if (this.#priceScale === priceScale) {
			return;
		}

		if (this.#priceScale !== null) {
			this.#priceScale.onMarksChanged().unsubscribeAll(this);
			this.#priceScale.optionsChanged().unsubscribeAll(this);
		}

		this.#priceScale = priceScale;
		priceScale.onMarksChanged().subscribe(this.#onMarksChanged.bind(this), this);
	}

	public priceScale(): PriceScale | null {
		return this.#priceScale;
	}

	public isVisible(): boolean {
		return this.#isVisible;
	}

	public setVisible(visible: boolean): void {
		if (visible === this.#isVisible) {
			return;
		}
		if (visible) {
			this.#cell.style.display = 'table-cell';
		} else {
			this.#cell.style.display = 'none';
		}

		this.#isVisible = visible;
	}

	public setAutoScale(on: boolean): void {
		const pane = this.#pane.state();
		const model = this.#pane.chart().model();
		model.setPriceAutoScale(pane, ensureNotNull(this.priceScale()), on);
	}

	public reset(): void {
		const pane = this.#pane.state();
		const model = this.#pane.chart().model();
		model.resetPriceScale(pane, ensureNotNull(this.priceScale()));
	}

	public paint(type: InvalidationLevel): void {
		if (!this.#isVisible || this.#size === null) {
			return;
		}

		if (type !== InvalidationLevel.Cursor) {
			const ctx = getContext2D(this.#canvasBinding.canvas);
			this.#alignLabels();
			this.#drawBackground(ctx, this.#canvasBinding.pixelRatio);
			this.#drawBorder(ctx, this.#canvasBinding.pixelRatio);
			this.#drawTickMarks(ctx, this.#canvasBinding.pixelRatio);
			this.#drawBackLabels(ctx, this.#canvasBinding.pixelRatio);
		}

		const topCtx = getContext2D(this.#topCanvasBinding.canvas);
		const width = this.#size.w;
		const height = this.#size.h;
		drawScaled(topCtx, this.#topCanvasBinding.pixelRatio, () => {
			topCtx.clearRect(0, 0, width, height);
		});

		this.#drawCrosshairLabel(topCtx, this.#topCanvasBinding.pixelRatio);
	}

	public getImage(): HTMLCanvasElement {
		return this.#canvasBinding.canvas;
	}

	public isLeft(): boolean {
		return this.#isLeft;
	}

	#mouseDownEvent(e: TouchMouseEvent): void {
		if (this.#priceScale === null || this.#priceScale.isEmpty() || !this.#pane.chart().options().handleScale.axisPressedMouseMove) {
			return;
		}

		const model = this.#pane.chart().model();
		const pane = this.#pane.state();
		this.#mousedown = true;
		model.startScalePrice(pane, this.#priceScale, e.localY as Coordinate);
	}

	#pressedMouseMoveEvent(e: TouchMouseEvent): void {
		if (this.#priceScale === null || !this.#pane.chart().options().handleScale.axisPressedMouseMove) {
			return;
		}

		const model = this.#pane.chart().model();
		const pane = this.#pane.state();
		const priceScale = this.#priceScale;
		model.scalePriceTo(pane, priceScale, e.localY as Coordinate);
	}

	#mouseDownOutsideEvent(): void {
		if (this.#priceScale === null || !this.#pane.chart().options().handleScale.axisPressedMouseMove) {
			return;
		}

		const model = this.#pane.chart().model();
		const pane = this.#pane.state();

		const priceScale = this.#priceScale;
		if (this.#mousedown) {
			this.#mousedown = false;
			model.endScalePrice(pane, priceScale);
		}
	}

	#mouseUpEvent(e: TouchMouseEvent): void {
		if (this.#priceScale === null || !this.#pane.chart().options().handleScale.axisPressedMouseMove) {
			return;
		}
		const model = this.#pane.chart().model();
		const pane = this.#pane.state();
		this.#mousedown = false;
		model.endScalePrice(pane, this.#priceScale);
	}

	#mouseDoubleClickEvent(e: TouchMouseEvent): void {
		if (this.#pane.chart().options().handleScale.axisDoubleClickReset) {
			this.reset();
		}
	}

	#mouseEnterEvent(e: TouchMouseEvent): void {
		if (this.#priceScale === null) {
			return;
		}

		const model = this.#pane.chart().model();
		if (model.options().handleScale.axisPressedMouseMove && !this.#priceScale.isPercentage() && !this.#priceScale.isIndexedTo100()) {
			this.#setCursor(CursorType.NsResize);
		}
	}

	#mouseLeaveEvent(e: TouchMouseEvent): void {
		this.#setCursor(CursorType.Default);
	}

	#backLabels(): IPriceAxisView[] {
		const res: IPriceAxisView[] = [];

		const priceScale = (this.#priceScale === null) ? undefined : this.#priceScale;

		const addViewsForSources = (sources: ReadonlyArray<IDataSource>) => {
			for (let i = 0; i < sources.length; ++i) {
				const source = sources[i];
				const views = source.priceAxisViews(this.#pane.state(), priceScale);
				for (let j = 0; j < views.length; j++) {
					res.push(views[j]);
				}
			}
		};

		// calculate max and min coordinates for views on selection
		// crosshair individually
		addViewsForSources(this.#pane.state().orderedSources());

		return res;
	}

	#drawBackground(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (this.#size === null) {
			return;
		}
		const width = this.#size.w;
		const height = this.#size.h;
		drawScaled(ctx, pixelRatio, () => {
			clearRect(ctx, 0, 0, width, height, this.backgroundColor());
		});
	}

	#drawBorder(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (this.#size === null || this.#priceScale === null || !this.#priceScale.options().borderVisible) {
			return;
		}
		ctx.save();

		ctx.fillStyle = this.lineColor();

		const borderSize = Math.max(1, Math.floor(this.rendererOptions().borderSize * pixelRatio));

		let left: number;
		if (this.#isLeft) {
			left = Math.floor(this.#size.w * pixelRatio) - borderSize;
		} else {
			left = 0;
		}

		ctx.fillRect(left, 0, borderSize, Math.ceil(this.#size.h * pixelRatio));
		ctx.restore();
	}

	#drawTickMarks(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (this.#size === null || this.#priceScale === null) {
			return;
		}

		const tickMarks = this.#priceScale.marks();

		ctx.save();

		ctx.strokeStyle = this.lineColor();

		ctx.font = this.baseFont();
		ctx.fillStyle = this.lineColor();
		const rendererOptions = this.rendererOptions();
		const drawTicks = this.#priceScale.options().borderVisible;

		const tickMarkLeftX = this.#isLeft ?
			Math.floor((this.#size.w - rendererOptions.tickLength) * pixelRatio - rendererOptions.borderSize * pixelRatio) :
			Math.floor(rendererOptions.borderSize * pixelRatio);

		const textLeftX = this.#isLeft ?
			Math.round(tickMarkLeftX - rendererOptions.paddingInner * pixelRatio) :
			Math.round(tickMarkLeftX + rendererOptions.tickLength * pixelRatio + rendererOptions.paddingInner * pixelRatio);

		const textAlign = this.#isLeft ? 'right' : 'left';
		const tickHeight = Math.max(1, Math.floor(pixelRatio));
		const tickOffset = Math.floor(pixelRatio * 0.5);

		if (drawTicks) {
			const tickLength = Math.round(rendererOptions.tickLength * pixelRatio);
			ctx.beginPath();
			for (const tickMark of tickMarks) {
				ctx.rect(tickMarkLeftX, Math.round(tickMark.coord * pixelRatio) - tickOffset, tickLength, tickHeight);
			}

			ctx.fill();
		}

		ctx.fillStyle = this.textColor();
		for (const tickMark of tickMarks) {
			this.#tickMarksCache.paintTo(ctx, tickMark.label, textLeftX, Math.round(tickMark.coord * pixelRatio), textAlign);
		}

		ctx.restore();
	}

	#alignLabels(): void {
		if (this.#size === null || this.#priceScale === null) {
			return;
		}
		let center = this.#size.h / 2;

		const views: IPriceAxisView[] = [];
		const orderedSources = this.#priceScale.orderedSources().slice(); // Copy of array
		const pane = this.#pane;
		const paneState = pane.state();
		const rendererOptions = this.rendererOptions();

		// if we are default price scale, append labels from no-scale
		const isDefault = this.#priceScale === paneState.defaultPriceScale();

		if (isDefault) {
			this.#pane.state().orderedSources().forEach((source: IDataSource) => {
				if (paneState.isOverlay(source)) {
					orderedSources.push(source);
				}
			});
		}

		const mainSource = this.#priceScale.mainSource();
		const priceScale = this.#priceScale;

		const updateForSources = (sources: IDataSource[]) => {
			sources.forEach((source: IDataSource) => {
				const sourceViews = source.priceAxisViews(paneState, priceScale);
				// never align selected sources
				sourceViews.forEach((view: IPriceAxisView) => {
					view.setFixedCoordinate(null);
					if (view.isVisible()) {
						views.push(view);
					}
				});
				if (mainSource === source && sourceViews.length > 0) {
					center = sourceViews[0].coordinate();
				}
			});
		};

		// crosshair individually
		updateForSources(orderedSources);

		// split into two parts
		const top = views.filter((view: IPriceAxisView) => view.coordinate() <= center);
		const bottom = views.filter((view: IPriceAxisView) => view.coordinate() > center);

		// sort top from center to top
		top.sort((l: IPriceAxisView, r: IPriceAxisView) => r.coordinate() - l.coordinate());

		// share center label
		if (top.length && bottom.length) {
			bottom.push(top[0]);
		}

		bottom.sort((l: IPriceAxisView, r: IPriceAxisView) => l.coordinate() - r.coordinate());

		views.forEach((view: IPriceAxisView) => view.setFixedCoordinate(view.coordinate()));

		const options = this.#priceScale.options();
		if (!options.alignLabels) {
			return;
		}

		for (let i = 1; i < top.length; i++) {
			const view = top[i];
			const prev = top[i - 1];
			const height = prev.height(rendererOptions, false);
			const coordinate = view.coordinate();
			const prevFixedCoordinate = prev.getFixedCoordinate();

			if (coordinate > prevFixedCoordinate - height) {
				view.setFixedCoordinate(prevFixedCoordinate - height);
			}
		}

		for (let j = 1; j < bottom.length; j++) {
			const view = bottom[j];
			const prev = bottom[j - 1];
			const height = prev.height(rendererOptions, true);
			const coordinate = view.coordinate();
			const prevFixedCoordinate = prev.getFixedCoordinate();

			if (coordinate < prevFixedCoordinate + height) {
				view.setFixedCoordinate(prevFixedCoordinate + height);
			}
		}
	}

	#drawBackLabels(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (this.#size === null) {
			return;
		}

		ctx.save();

		const size = this.#size;
		const views = this.#backLabels();

		const rendererOptions = this.rendererOptions();
		const align = this.#isLeft ? 'right' : 'left';

		views.forEach((view: IPriceAxisView) => {
			if (view.isAxisLabelVisible()) {
				const renderer = view.renderer();
				ctx.save();
				renderer.draw(ctx, rendererOptions, this.#widthCache, size.w, align, pixelRatio);
				ctx.restore();
			}
		});

		ctx.restore();
	}

	#drawCrosshairLabel(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		if (this.#size === null || this.#priceScale === null) {
			return;
		}

		ctx.save();

		const size = this.#size;
		const model = this.#pane.chart().model();

		const views: IPriceAxisViewArray[] = []; // array of arrays
		const pane = this.#pane.state();

		const v = model.crosshairSource().priceAxisViews(pane, this.#priceScale);
		if (v.length) {
			views.push(v);
		}

		const ro = this.rendererOptions();
		const align = this.#isLeft ? 'right' : 'left';

		views.forEach((arr: IPriceAxisViewArray) => {
			arr.forEach((view: IPriceAxisView) => {
				ctx.save();
				view.renderer().draw(ctx, ro, this.#widthCache, size.w, align, pixelRatio);
				ctx.restore();
			});
		});

		ctx.restore();
	}

	#setCursor(type: CursorType): void {
		this.#cell.style.cursor = type === CursorType.NsResize ? 'ns-resize' : 'default';
	}

	#onMarksChanged(): void {
		const width = this.optimalWidth();

		if (this.#prevOptimalWidth < width) {
			// avoid price scale is shrunk
			// using < instead !== to avoid infinite changes

			const chart = this.#pane.chart();

			if (this.#updateTimeout === null) {
				this.#updateTimeout = setTimeout(
					() => {
						if (chart) {
							chart.model().fullUpdate();
						}
						this.#updateTimeout = null;
					},
					100);
			}
		}

		this.#prevOptimalWidth = width;
	}

	#recreateTickMarksCache(options: PriceAxisViewRendererOptions): void {
		this.#tickMarksCache.destroy();

		this.#tickMarksCache = new LabelsImageCache(
			options.fontSize,
			options.color,
			options.fontFamily
		);
	}

	readonly #canvasConfiguredHandler = () => {
		this.#recreateTickMarksCache(this.#rendererOptionsProvider.options());
		const model = this.#pane.chart().model();
		model.lightUpdate();
	}

	readonly #topCanvasConfiguredHandler = () => {
		const model = this.#pane.chart().model();
		model.lightUpdate();
	}
}
