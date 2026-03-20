import type { Binding as CanvasCoordinateSpaceBinding } from 'fancy-canvas/coordinate-space';

import { ensureNotNull } from '../helpers/assertions';
import { clearRect, drawScaled } from '../helpers/canvas-helpers';
import { Delegate } from '../helpers/delegate';
import type { IDestroyable } from '../helpers/idestroyable';
import type { ISubscription } from '../helpers/isubscription';

import { ChartModel, type HoveredObject } from '../model/chart-model';
import type { Coordinate } from '../model/coordinate';
import type { IDataSource } from '../model/data-source/idata-source';
import { InvalidationLevel } from '../model/invalidate-mask';
import { Pane } from '../model/pane';
import type { Point } from '../model/point';
import type { PriceAxisPosition } from '../model/price-scale/price-scale';
import type { TimePointIndex } from '../model/time-scale/time-data';
import type { IPaneView } from '../views/pane/ipane-view';

import { createBoundCanvas, getContext2D, Size } from './canvas-utils';
import { ChartWidget } from './chart-widget';
import { MouseEventHandler, type Position, type TouchMouseEvent } from './mouse-event-handler';
import { PriceAxisWidget } from './price-axis-widget';
import { isMobile, mobileTouch } from './support-touch';

// actually we should check what event happened (touch or mouse)
// not check current UA to detect "mobile" device
const trackCrosshairOnlyAfterLongTap = isMobile;

export interface HitTestResult {
	source: IDataSource;
	object?: HoveredObject;
	view: IPaneView;
}

interface HitTestPaneViewResult {
	view: IPaneView;
	object?: HoveredObject;
}

export class PaneWidget implements IDestroyable {
	readonly #chart: ChartWidget;
	#state: Pane | null;
	#size: Size = new Size(0, 0);
	#priceAxisWidget: PriceAxisWidget | null = null;
	readonly #paneCell: HTMLElement;
	readonly #leftAxisCell: HTMLElement;
	readonly #rightAxisCell: HTMLElement;
	readonly #canvasBinding: CanvasCoordinateSpaceBinding;
	readonly #topCanvasBinding: CanvasCoordinateSpaceBinding;
	readonly #rowElement: HTMLElement;
	readonly #mouseEventHandler: MouseEventHandler;
	#startScrollingPos: Point | null = null;
	#isScrolling: boolean = false;
	#priceAxisPosition: PriceAxisPosition = 'none';
	#clicked: Delegate<TimePointIndex | null, Point> = new Delegate();
	#prevPinchScale: number = 0;
	#longTap: boolean = false;
	#startTrackPoint: Point | null = null;
	#exitTrackingModeOnNextTry: boolean = false;
	#initCrosshairPosition: Point | null = null;

	public constructor(chart: ChartWidget, state: Pane) {
		this.#chart = chart;

		this.#state = state;
		this.#state.onDestroyed().subscribe(this.#onStateDestroyed.bind(this), this, true);

		this.#paneCell = document.createElement('td');
		this.#paneCell.style.padding = '0';
		this.#paneCell.style.position = 'relative';

		const paneWrapper = document.createElement('div');
		paneWrapper.style.width = '100%';
		paneWrapper.style.height = '100%';
		paneWrapper.style.position = 'relative';
		paneWrapper.style.overflow = 'hidden';

		this.#leftAxisCell = document.createElement('td');
		this.#leftAxisCell.style.padding = '0';

		this.#rightAxisCell = document.createElement('td');
		this.#rightAxisCell.style.padding = '0';

		this.#paneCell.appendChild(paneWrapper);

		this.#canvasBinding = createBoundCanvas(paneWrapper, new Size(16, 16));
		this.#canvasBinding.subscribeCanvasConfigured(this.#canvasConfiguredHandler);
		const canvas = this.#canvasBinding.canvas;
		canvas.style.position = 'absolute';
		canvas.style.zIndex = '1';
		canvas.style.left = '0';
		canvas.style.top = '0';

		this.#topCanvasBinding = createBoundCanvas(paneWrapper, new Size(16, 16));
		this.#topCanvasBinding.subscribeCanvasConfigured(this.#topCanvasConfiguredHandler);
		const topCanvas = this.#topCanvasBinding.canvas;
		topCanvas.style.position = 'absolute';
		topCanvas.style.zIndex = '2';
		topCanvas.style.left = '0';
		topCanvas.style.top = '0';

		this.#rowElement = document.createElement('tr');
		this.#rowElement.appendChild(this.#leftAxisCell);
		this.#rowElement.appendChild(this.#paneCell);
		this.#rowElement.appendChild(this.#rightAxisCell);
		this.#recreatePriceAxisWidgetImpl();
		chart.model().mainPriceScaleOptionsChanged().subscribe(this.#recreatePriceAxisWidget.bind(this), this);
		this.updatePriceAxisWidget();

		const scrollOptions = this.chart().options().handleScroll;
		this.#mouseEventHandler = new MouseEventHandler(
			this.#topCanvasBinding.canvas,
			this,
			{
				treatVertTouchDragAsPageScroll: !scrollOptions.vertTouchDrag,
				treatHorzTouchDragAsPageScroll: !scrollOptions.horzTouchDrag,
			}
		);
	}

	public destroy(): void {
		if (this.#priceAxisWidget !== null) {
			this.#priceAxisWidget.destroy();
		}

		this.#topCanvasBinding.unsubscribeCanvasConfigured(this.#topCanvasConfiguredHandler);
		this.#topCanvasBinding.destroy();

		this.#canvasBinding.unsubscribeCanvasConfigured(this.#canvasConfiguredHandler);
		this.#canvasBinding.destroy();

		if (this.#state !== null) {
			this.#state.onDestroyed().unsubscribeAll(this);
		}

		this.#mouseEventHandler.destroy();
	}

	public state(): Pane {
		return ensureNotNull(this.#state);
	}

	public stateOrNull(): Pane | null {
		return this.#state;
	}

	public setState(pane: Pane | null): void {
		if (this.#state !== null) {
			this.#state.onDestroyed().unsubscribeAll(this);
		}

		this.#state = pane;

		if (this.#state !== null) {
			this.#state.onDestroyed().subscribe(this.#onStateDestroyed.bind(this), this, true);
		}

		this.updatePriceAxisWidget();
	}

	public chart(): ChartWidget {
		return this.#chart;
	}

	public getElement(): HTMLElement {
		return this.#rowElement;
	}

	public updatePriceAxisWidget(): void {
		if (this.#state === null || this.#priceAxisWidget === null) {
			return;
		}

		if (this.#model().serieses().length === 0) {
			return;
		}

		const priceScale = this.#state.defaultPriceScale();
		this.#priceAxisWidget.setPriceScale(ensureNotNull(priceScale));
	}

	public stretchFactor(): number {
		return this.#state !== null ? this.#state.stretchFactor() : 0;
	}

	public setStretchFactor(stretchFactor: number): void {
		if (this.#state) {
			this.#state.setStretchFactor(stretchFactor);
		}
	}

	public mouseEnterEvent(event: TouchMouseEvent): void {
		if (!this.#state) {
			return;
		}

		const x = event.localX as Coordinate;
		const y = event.localY as Coordinate;

		if (!mobileTouch) {
			this.#setCrosshairPosition(x, y);
		}
	}

	public mouseDownEvent(event: TouchMouseEvent): void {
		this.#longTap = false;
		this.#exitTrackingModeOnNextTry = this.#startTrackPoint !== null;

		if (!this.#state) {
			return;
		}

		if (document.activeElement !== document.body && document.activeElement !== document.documentElement) {
			// If any focusable element except the page itself is focused, remove the focus
			(ensureNotNull(document.activeElement) as HTMLElement).blur();
		} else {
			// Clear selection
			const selection = document.getSelection();
			if (selection !== null) {
				selection.removeAllRanges();
			}
		}

		const model = this.#model();

		const priceScale = this.#state.defaultPriceScale();

		if (priceScale.isEmpty() || model.timeScale().isEmpty()) {
			return;
		}

		if (this.#startTrackPoint !== null) {
			const crosshair = model.crosshairSource();
			this.#initCrosshairPosition = { x: crosshair.appliedX(), y: crosshair.appliedY() };
			this.#startTrackPoint = { x: event.localX as Coordinate, y: event.localY as Coordinate };
		}

		if (!mobileTouch) {
			this.#setCrosshairPosition(event.localX as Coordinate, event.localY as Coordinate);
		}
	}

	public mouseMoveEvent(event: TouchMouseEvent): void {
		if (!this.#state) {
			return;
		}

		const x = event.localX as Coordinate;
		const y = event.localY as Coordinate;

		if (this.#preventCrosshairMove()) {
			this.#clearCrosshairPosition();
		}

		if (!mobileTouch) {
			this.#setCrosshairPosition(x, y);
			const hitTest = this.hitTest(x, y);
			this.#model().setHoveredSource(hitTest && { source: hitTest.source, object: hitTest.object });
			if (hitTest !== null && hitTest.view.moveHandler !== undefined) {
				hitTest.view.moveHandler(x, y);
			}
		}
	}

	public mouseClickEvent(event: TouchMouseEvent): void {
		if (this.#state === null) {
			return;
		}

		const x = event.localX as Coordinate;
		const y = event.localY as Coordinate;
		const hitTest = this.hitTest(x, y);
		if (hitTest !== null && hitTest.view.clickHandler !== undefined) {
			hitTest.view.clickHandler(x, y);
		}

		if (this.#clicked.hasListeners()) {
			const currentTime = this.#model().crosshairSource().appliedIndex();
			this.#clicked.fire(currentTime, { x, y });
		}

		this.#tryExitTrackingMode();
	}

	public pressedMouseMoveEvent(event: TouchMouseEvent): void {
		if (this.#state === null) {
			return;
		}

		const model = this.#model();
		const x = event.localX as Coordinate;
		const y = event.localY as Coordinate;

		if (this.#startTrackPoint !== null) {
			// tracking mode: move crosshair
			this.#exitTrackingModeOnNextTry = false;
			const origPoint = ensureNotNull(this.#initCrosshairPosition);
			const newX = origPoint.x + (x - this.#startTrackPoint.x) as Coordinate;
			const newY = origPoint.y + (y - this.#startTrackPoint.y) as Coordinate;
			this.#setCrosshairPosition(newX, newY);
		} else if (!this.#preventCrosshairMove()) {
			this.#setCrosshairPosition(x, y);
		}

		if (model.timeScale().isEmpty()) {
			return;
		}

		const scrollOptions = this.#chart.options().handleScroll;
		if (
			(!scrollOptions.pressedMouseMove || event.type === 'touch') &&
			(!scrollOptions.horzTouchDrag && !scrollOptions.vertTouchDrag || event.type === 'mouse')
		) {
			return;
		}

		const priceScale = this.#state.defaultPriceScale();

		if (this.#startScrollingPos === null && !this.#preventScroll()) {
			this.#startScrollingPos = {
				x: event.clientX as Coordinate,
				y: event.clientY as Coordinate,
			};
		}

		if (this.#startScrollingPos !== null &&
			(this.#startScrollingPos.x !== event.clientX || this.#startScrollingPos.y !== event.clientY)) {
			if (!this.#isScrolling) {
				if (!priceScale.isEmpty()) {
					model.startScrollPrice(this.#state, priceScale, event.localY as Coordinate);
				}

				model.startScrollTime(event.localX as Coordinate);
				this.#isScrolling = true;
			}
		}

		if (this.#isScrolling) {
			// this allows scrolling not default price scales
			if (!priceScale.isEmpty()) {
				model.scrollPriceTo(this.#state, priceScale, event.localY as Coordinate);
			}

			model.scrollTimeTo(event.localX as Coordinate);
		}
	}

	public mouseUpEvent(event: TouchMouseEvent): void {
		if (this.#state === null) {
			return;
		}

		this.#longTap = false;

		const model = this.#model();

		if (this.#isScrolling) {
			const priceScale = this.#state.defaultPriceScale();
			// this allows scrolling not default price scales

			model.endScrollPrice(this.#state, priceScale);
			model.endScrollTime();
			this.#startScrollingPos = null;
			this.#isScrolling = false;
		}
	}

	public longTapEvent(event: TouchMouseEvent): void {
		this.#longTap = true;

		if (this.#startTrackPoint === null && trackCrosshairOnlyAfterLongTap) {
			const point = { x: event.localX as Coordinate, y: event.localY as Coordinate };
			this.#startTrackingMode(point, point);
		}
	}

	public mouseLeaveEvent(event: TouchMouseEvent): void {
		if (this.#state === null) {
			return;
		}

		this.#state.model().setHoveredSource(null);

		if (!isMobile) {
			this.#clearCrosshairPosition();
		}
	}

	public clicked(): ISubscription<TimePointIndex | null, Point> {
		return this.#clicked;
	}

	public pinchStartEvent(): void {
		this.#prevPinchScale = 1;
	}

	public pinchEvent(middlePoint: Position, scale: number): void {
		if (!this.#chart.options().handleScale.pinch) {
			return;
		}

		const zoomScale = (scale - this.#prevPinchScale) * 5;
		this.#prevPinchScale = scale;

		this.#model().zoomTime(middlePoint.x as Coordinate, zoomScale);
	}

	public hitTest(x: Coordinate, y: Coordinate): HitTestResult | null {
		const state = this.#state;
		if (state === null) {
			return null;
		}

		const sources = state.orderedSources();
		for (const source of sources) {
			const sourceResult = this.#hitTestPaneView(source.paneViews(state), x, y);
			if (sourceResult !== null) {
				return {
					source: source,
					view: sourceResult.view,
					object: sourceResult.object,
				};
			}
		}

		return null;
	}

	public setPriceAxisSize(width: number): void {
		ensureNotNull(this.#priceAxisWidget).setSize(new Size(width, this.#size.h));
	}

	public getSize(): Size {
		return this.#size;
	}

	public setSize(size: Size): void {
		if (size.w < 0 || size.h < 0) {
			throw new Error('Try to set invalid size to PaneWidget ' + JSON.stringify(size));
		}

		if (this.#size.equals(size)) {
			return;
		}

		this.#size = size;

		this.#canvasBinding.resizeCanvas({ width: size.w, height: size.h });
		this.#topCanvasBinding.resizeCanvas({ width: size.w, height: size.h });

		this.#paneCell.style.width = size.w + 'px';
		this.#paneCell.style.height = size.h + 'px';
	}

	public recalculatePriceScale(): void {
		const pane = ensureNotNull(this.#state);
		pane.recalculatePriceScale(pane.defaultPriceScale());

		for (const source of pane.dataSources()) {
			if (pane.isOverlay(source)) {
				const priceScale = source.priceScale();
				if (priceScale !== null) {
					pane.recalculatePriceScale(priceScale);
				}

				// for overlay drawings price scale is owner's price scale
				// however owner's price scale could not contain ds
				source.updateAllViews();
			}
		}
	}

	public getImage(): HTMLCanvasElement {
		return this.#canvasBinding.canvas;
	}

	public paint(type: InvalidationLevel): void {
		if (type === InvalidationLevel.None) {
			return;
		}

		if (this.#state === null) {
			return;
		}

		if (type > InvalidationLevel.Cursor) {
			this.recalculatePriceScale();
		}

		if (this.#priceAxisWidget !== null) {
			this.#priceAxisWidget.paint(type);
		}

		if (type !== InvalidationLevel.Cursor) {
			const ctx = getContext2D(this.#canvasBinding.canvas);
			ctx.save();
			this.#drawBackground(ctx, this.#backgroundColor(), this.#canvasBinding.pixelRatio);
			if (this.#state) {
				this.#drawGrid(ctx, this.#canvasBinding.pixelRatio);
				this.#drawWatermark(ctx, this.#canvasBinding.pixelRatio);
				this.#drawSources(ctx, this.#canvasBinding.pixelRatio);
			}
			ctx.restore();
		}

		const topCtx = getContext2D(this.#topCanvasBinding.canvas);
		topCtx.clearRect(0, 0, Math.ceil(this.#size.w * this.#topCanvasBinding.pixelRatio), Math.ceil(this.#size.h * this.#topCanvasBinding.pixelRatio));
		this.#drawCrosshair(topCtx, this.#topCanvasBinding.pixelRatio);
	}

	public priceAxisWidget(): PriceAxisWidget | null {
		return this.#priceAxisWidget;
	}

	#backgroundColor(): string {
		return this.#chart.options().layout.backgroundColor;
	}

	#onStateDestroyed(): void {
		if (this.#state !== null) {
			this.#state.onDestroyed().unsubscribeAll(this);
		}

		this.#state = null;
	}

	#drawBackground(ctx: CanvasRenderingContext2D, color: string, pixelRatio: number): void {
		drawScaled(ctx, pixelRatio, () => {
			clearRect(ctx, 0, 0, this.#size.w, this.#size.h, color);
		});
	}

	#drawGrid(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		const state = ensureNotNull(this.#state);
		const source = this.#model().gridSource();
		// NOTE: grid source requires Pane instance for paneViews (for the nonce)
		const paneViews = source.paneViews(state);
		const height = state.height();
		const width = state.width();

		for (const paneView of paneViews) {
			ctx.save();
			const renderer = paneView.renderer(height, width);
			if (renderer !== null) {
				renderer.draw(ctx, pixelRatio, false);
			}

			ctx.restore();
		}
	}

	#drawWatermark(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		const source = this.#model().watermarkSource();
		if (source === null) {
			return;
		}

		const state = ensureNotNull(this.#state);
		if (!state.containsSeries()) {
			return;
		}

		const paneViews = source.paneViews();
		const height = state.height();
		const width = state.width();

		for (const paneView of paneViews) {
			ctx.save();
			const renderer = paneView.renderer(height, width);
			if (renderer !== null) {
				renderer.draw(ctx, pixelRatio, false);
			}

			ctx.restore();
		}
	}

	#drawCrosshair(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		this.#drawSource(this.#model().crosshairSource(), ctx, pixelRatio);
	}

	#drawSources(ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		const state = ensureNotNull(this.#state);
		const sources = state.orderedSources();
		const crosshairSource = this.#model().crosshairSource();

		for (const source of sources) {
			this.#drawSourceBackground(source, ctx, pixelRatio);
		}

		for (const source of sources) {
			if (source !== crosshairSource) {
				this.#drawSource(source, ctx, pixelRatio);
			}
		}
	}

	#drawSource(source: IDataSource, ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		const state = ensureNotNull(this.#state);
		const paneViews = source.paneViews(state);
		const height = state.height();
		const width = state.width();
		const hoveredSource = state.model().hoveredSource();
		const isHovered = hoveredSource !== null && hoveredSource.source === source;
		const objecId = hoveredSource !== null && isHovered && hoveredSource.object !== undefined
			? hoveredSource.object.hitTestData
			: undefined;

		for (const paneView of paneViews) {
			const renderer = paneView.renderer(height, width);
			if (renderer !== null) {
				ctx.save();
				renderer.draw(ctx, pixelRatio, isHovered, objecId);
				ctx.restore();
			}
		}
	}

	#drawSourceBackground(source: IDataSource, ctx: CanvasRenderingContext2D, pixelRatio: number): void {
		const state = ensureNotNull(this.#state);
		const paneViews = source.paneViews(state);
		const height = state.height();
		const width = state.width();
		const hoveredSource = state.model().hoveredSource();
		const isHovered = hoveredSource !== null && hoveredSource.source === source;
		const objecId = hoveredSource !== null && isHovered && hoveredSource.object !== undefined
			? hoveredSource.object.hitTestData
			: undefined;

		for (const paneView of paneViews) {
			const renderer = paneView.renderer(height, width);
			if (renderer !== null && renderer.drawBackground !== undefined) {
				ctx.save();
				renderer.drawBackground(ctx, pixelRatio, isHovered, objecId);
				ctx.restore();
			}
		}
	}

	#hitTestPaneView(paneViews: ReadonlyArray<IPaneView>, x: Coordinate, y: Coordinate): HitTestPaneViewResult | null {
		for (const paneView of paneViews) {
			const renderer = paneView.renderer(this.#size.h, this.#size.w);
			if (renderer !== null && renderer.hitTest) {
				const result = renderer.hitTest(x, y);
				if (result !== null) {
					return {
						view: paneView,
						object: result,
					};
				}
			}
		}

		return null;
	}

	#recreatePriceAxisWidget(): void {
		this.#recreatePriceAxisWidgetImpl();
		this.#chart.adjustSize();
	}

	#recreatePriceAxisWidgetImpl(): void {
		if (this.#state === null) {
			return;
		}
		const chart = this.#chart;
		const axisPosition = this.#state.defaultPriceScale().options().position;
		if (this.#priceAxisPosition === axisPosition) {
			return;
		}
		if (this.#priceAxisWidget !== null) {
			if (this.#priceAxisWidget.isLeft()) {
				this.#leftAxisCell.removeChild(this.#priceAxisWidget.getElement());
			} else {
				this.#rightAxisCell.removeChild(this.#priceAxisWidget.getElement());
			}

			this.#priceAxisWidget.destroy();
			this.#priceAxisWidget = null;
		}

		if (axisPosition !== 'none') {
			const rendererOptionsProvider = chart.model().rendererOptionsProvider();
			this.#priceAxisWidget = new PriceAxisWidget(this, chart.options().layout, rendererOptionsProvider, axisPosition);

			if (axisPosition === 'left') {
				this.#leftAxisCell.appendChild(this.#priceAxisWidget.getElement());
			}

			if (axisPosition === 'right') {
				this.#rightAxisCell.appendChild(this.#priceAxisWidget.getElement());
			}
		}
		this.#priceAxisPosition = axisPosition;
	}

	#preventCrosshairMove(): boolean {
		return trackCrosshairOnlyAfterLongTap && this.#startTrackPoint === null;
	}

	#preventScroll(): boolean {
		return trackCrosshairOnlyAfterLongTap && this.#longTap || this.#startTrackPoint !== null;
	}

	#correctXCoord(x: Coordinate): Coordinate {
		return Math.max(0, Math.min(x, this.#size.w - 1)) as Coordinate;
	}

	#correctYCoord(y: Coordinate): Coordinate {
		return Math.max(0, Math.min(y, this.#size.h - 1)) as Coordinate;
	}

	#setCrosshairPosition(x: Coordinate, y: Coordinate): void {
		this.#model().setAndSaveCurrentPosition(this.#correctXCoord(x), this.#correctYCoord(y), ensureNotNull(this.#state));
	}

	#clearCrosshairPosition(): void {
		this.#model().clearCurrentPosition();
	}

	#tryExitTrackingMode(): void {
		if (this.#exitTrackingModeOnNextTry) {
			this.#startTrackPoint = null;
			this.#clearCrosshairPosition();
		}
	}

	#startTrackingMode(startTrackPoint: Point, crossHairPosition: Point): void {
		this.#startTrackPoint = startTrackPoint;
		this.#exitTrackingModeOnNextTry = false;
		this.#setCrosshairPosition(crossHairPosition.x, crossHairPosition.y);
		const crosshair = this.#model().crosshairSource();
		this.#initCrosshairPosition = { x: crosshair.appliedX(), y: crosshair.appliedY() };
	}

	#model(): ChartModel {
		return this.#chart.model();
	}

	readonly #canvasConfiguredHandler = () => this.#state && this.#model().lightUpdate();
	readonly #topCanvasConfiguredHandler = () => this.#state && this.#model().lightUpdate();
}
