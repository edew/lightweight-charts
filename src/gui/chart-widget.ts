// The DOM part of the chart: two canvases, size observation, the frame loop and
// pointer input. All drawing is in src/draw; all state is in the model.

import { ensureNotNull } from '../helpers/assertions';
import type { IDestroyable } from '../helpers/idestroyable';
import type { DeepPartial } from '../helpers/strict-type-checks';

import { drawOverlay, drawStatic, layoutChart, layoutPriceAxisWidth } from '../draw/chart';
import { type HitResult, hitTest, type Layout, Region } from '../draw/layout';

import { ChartModel, type ChartOptionsInternal } from '../model/chart-model';
import type { Coordinate } from '../model/coordinate';
import { InvalidateMask, InvalidationLevel } from '../model/invalidate-mask';
import type { Pane } from '../model/pane';
import type { TimePointIndex } from '../model/time-scale/time-data';

import { bindPointerEvents, type PointerHandlers } from './pointer-events';

/** A separator can be grabbed this number of pixels above and below it. */
const SEPARATOR_GRAB_MARGIN = 4;
const MIN_PANE_HEIGHT_ON_RESIZE = 30;
const MIN_CHART_WIDTH = 70;
const MIN_CHART_HEIGHT = 50;

export interface Point {
	x: number;
	y: number;
}

/** Called with the time index under the pointer and the pointer position in the pane. */
export type ChartPointerCallback = (index: TimePointIndex | null, point: Point | null) => void;

function createCanvas(zIndex: string): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	const style = canvas.style;
	style.position = 'absolute';
	style.left = '0';
	style.top = '0';
	style.width = '100%';
	style.height = '100%';
	style.zIndex = zIndex;
	// the chart does all selection and scroll handling itself
	style.userSelect = 'none';
	style.setProperty('-webkit-user-select', 'none');
	style.setProperty('-webkit-tap-highlight-color', 'transparent');
	return canvas;
}

export class ChartWidget implements IDestroyable, PointerHandlers {
	/** Set by the API layer. */
	public onClick: ChartPointerCallback | null = null;
	public onCrosshairMove: ChartPointerCallback | null = null;

	readonly #options: ChartOptionsInternal;
	readonly #model: ChartModel;
	readonly #element: HTMLDivElement;
	readonly #staticCanvas: HTMLCanvasElement;
	readonly #overlayCanvas: HTMLCanvasElement;
	readonly #staticCtx: CanvasRenderingContext2D;
	readonly #overlayCtx: CanvasRenderingContext2D;
	readonly #resizeObserver: ResizeObserver;
	readonly #unbindPointerEvents: () => void;
	readonly #onWheelBound: (event: WheelEvent) => void;

	// size in CSS pixels, and the size of the canvas bitmaps in device pixels
	#width: number = 0;
	#height: number = 0;
	#bitmapWidth: number = 0;
	#bitmapHeight: number = 0;
	#pixelRatio: number = 1;
	/** True when the browser gives the exact bitmap size in device pixels. */
	#exactBitmapSize: boolean = false;
	#layout: Layout;

	// frame loop
	#invalidateMask: InvalidateMask | null = null;
	#rafId: number = 0;
	/** True while a frame prepares the model: invalidations from that step need no new frame. */
	#preparing: boolean = false;

	// pointer state
	readonly #hit: HitResult = { region: Region.None, index: -1, x: 0, y: 0 };
	#dragRegion: Region = Region.None;
	#dragIndex: number = -1;
	#isScrolling: boolean = false;
	#scrollStartX: number = NaN;
	#scrollStartY: number = NaN;
	#prevPinchScale: number = 1;
	#separatorStartY: number = 0;
	#separatorStartHeights: number[] = [];
	// touch: the crosshair shows only after a long tap ("tracking mode"), then a drag moves it
	#longTap: boolean = false;
	#trackStart: Point | null = null;
	#trackCrosshairStart: Point = { x: 0, y: 0 };
	#exitTrackingModeOnNextTry: boolean = false;

	public constructor(container: HTMLElement, options: ChartOptionsInternal) {
		this.#options = options;

		const element = document.createElement('div');
		element.classList.add('tv-lightweight-charts');
		element.style.position = 'relative';
		element.style.overflow = 'hidden';
		this.#element = element;

		this.#staticCanvas = createCanvas('1');
		this.#overlayCanvas = createCanvas('2');
		element.appendChild(this.#staticCanvas);
		element.appendChild(this.#overlayCanvas);
		this.#staticCtx = ensureNotNull(this.#staticCanvas.getContext('2d'));
		this.#overlayCtx = ensureNotNull(this.#overlayCanvas.getContext('2d'));

		this.#model = new ChartModel((mask: InvalidateMask) => this.#invalidate(mask), options);
		this.#applyTouchAction();

		let width = options.width;
		let height = options.height;
		if (width === 0 && height === 0) {
			const containerRect = container.getBoundingClientRect();
			width = Math.floor(containerRect.width);
			height = Math.floor(containerRect.height);
		}
		this.#layout = layoutChart(this.#staticCtx, this.#model, MIN_CHART_WIDTH, MIN_CHART_HEIGHT, 0);
		this.resize(width, height);

		container.appendChild(element);

		// the bitmap of a canvas must have the size of the canvas in device pixels, or the image is not sharp
		this.#resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => this.#onCanvasResized(entries[0]));
		try {
			this.#resizeObserver.observe(this.#staticCanvas, { box: 'device-pixel-content-box' });
		} catch {
			// Safari: the size comes from the CSS size and the device pixel ratio
			this.#resizeObserver.observe(this.#staticCanvas);
		}

		this.#unbindPointerEvents = bindPointerEvents(element, this);
		this.#onWheelBound = this.#onWheel.bind(this);
		element.addEventListener('wheel', this.#onWheelBound, { passive: false });
	}

	public destroy(): void {
		if (this.#rafId !== 0) {
			cancelAnimationFrame(this.#rafId);
			this.#rafId = 0;
		}

		this.#resizeObserver.disconnect();
		this.#unbindPointerEvents();
		this.#element.removeEventListener('wheel', this.#onWheelBound);
		this.#model.destroy();
		this.#element.remove();
		this.onClick = null;
		this.onCrosshairMove = null;
	}

	public model(): ChartModel {
		return this.#model;
	}

	public options(): Readonly<ChartOptionsInternal> {
		return this.#options;
	}

	public resize(width: number, height: number, forceRepaint: boolean = false): void {
		width = Math.max(MIN_CHART_WIDTH, width);
		height = Math.max(MIN_CHART_HEIGHT, height);
		if (this.#height === height && this.#width === width) {
			return;
		}

		this.#width = width;
		this.#height = height;
		this.#element.style.width = width + 'px';
		this.#element.style.height = height + 'px';

		if (!this.#exactBitmapSize) {
			this.#pixelRatio = window.devicePixelRatio || 1;
			this.#bitmapWidth = Math.round(width * this.#pixelRatio);
			this.#bitmapHeight = Math.round(height * this.#pixelRatio);
		}

		// the model needs its size now, not in the next frame: the time scale uses the
		// width when it gets data
		this.#layout = layoutChart(this.#staticCtx, this.#model, width, height, 0);

		if (forceRepaint) {
			this.#draw(new InvalidateMask(InvalidationLevel.Full));
		} else {
			this.#model.fullUpdate();
		}
	}

	public applyOptions(options: DeepPartial<ChartOptionsInternal>): void {
		this.#model.applyOptions(options);
		this.#applyTouchAction();
		this.resize(options.width || this.#width, options.height || this.#height);
	}

	/** Draws the chart, with the crosshair, on a new canvas. */
	public takeScreenshot(): HTMLCanvasElement {
		this.#flush();

		const canvas = document.createElement('canvas');
		canvas.width = this.#bitmapWidth;
		canvas.height = this.#bitmapHeight;
		canvas.style.width = this.#width + 'px';
		canvas.style.height = this.#height + 'px';
		const ctx = ensureNotNull(canvas.getContext('2d'));
		drawStatic(ctx, this.#model, this.#layout, this.#pixelRatio);
		drawOverlay(ctx, this.#model, this.#layout, this.#pixelRatio);
		return canvas;
	}

	// ---- pointer input (PointerHandlers)

	public hover(x: number, y: number): void {
		const hit = this.#hitTest(x, y);
		this.#setCursor(hit.region, hit.index);
		if (hit.region === Region.Pane) {
			this.#setCrosshair(hit.index, hit.x, hit.y);
		} else {
			this.#model.clearCrosshairPosition();
		}
	}

	public leave(): void {
		this.#model.clearCrosshairPosition();
	}

	public down(x: number, y: number, isTouch: boolean): void {
		const hit = this.#hitTest(x, y);
		const model = this.#model;
		this.#dragRegion = hit.region;
		this.#dragIndex = hit.index;

		switch (hit.region) {
			case Region.Pane: {
				this.#longTap = false;
				this.#exitTrackingModeOnNextTry = this.#trackStart !== null;

				const pane = model.panes()[hit.index];
				if (pane.priceScale.isEmpty() || model.timeScale().isEmpty()) {
					return;
				}

				if (this.#trackStart !== null) {
					const crosshair = model.crosshair();
					this.#trackCrosshairStart = { x: crosshair.x, y: crosshair.y };
					this.#trackStart = { x: hit.x, y: hit.y };
				}

				if (!isTouch) {
					this.#setCrosshair(hit.index, hit.x, hit.y);
				}
				break;
			}

			case Region.PriceAxis: {
				const priceScale = model.panes()[hit.index].priceScale;
				if (this.#options.handleScale.axisPressedMouseMove && !priceScale.isEmpty()) {
					model.startScalePrice(priceScale, hit.y);
				}
				break;
			}

			case Region.TimeAxis:
				if (this.#options.handleScale.axisPressedMouseMove && !model.timeScale().isEmpty()) {
					model.startScaleTime(hit.x as Coordinate);
				}
				break;

			case Region.Separator: {
				this.#separatorStartY = y;
				this.#separatorStartHeights = this.#layout.panes.map((rect: { height: number }) => rect.height);
				break;
			}
		}
	}

	public drag(x: number, y: number, isTouch: boolean): void {
		const model = this.#model;
		const index = this.#dragIndex;

		switch (this.#dragRegion) {
			case Region.Pane: {
				const rect = this.#layout.panes[index];
				this.#dragPane(model.panes()[index], index, x - rect.left, y - rect.top, isTouch);
				break;
			}

			case Region.PriceAxis:
				if (this.#options.handleScale.axisPressedMouseMove) {
					const pane = model.panes()[index];
					model.scalePriceTo(pane, pane.priceScale, y - this.#layout.priceAxes[index].top);
				}
				break;

			case Region.TimeAxis:
				if (this.#options.handleScale.axisPressedMouseMove && !model.timeScale().isEmpty()) {
					model.scaleTimeTo(x - ensureNotNull(this.#layout.timeAxis).left as Coordinate);
				}
				break;

			case Region.Separator:
				this.#dragSeparator(index, y - this.#separatorStartY);
				break;
		}
	}

	public up(): void {
		const model = this.#model;
		const pane = this.#dragIndex >= 0 ? model.panes()[this.#dragIndex] : undefined;

		switch (this.#dragRegion) {
			case Region.Pane:
				this.#longTap = false;
				if (this.#isScrolling && pane !== undefined) {
					model.endScrollPrice(pane, pane.priceScale);
					model.endScrollTime();
				}
				this.#isScrolling = false;
				this.#scrollStartX = NaN;
				break;

			case Region.PriceAxis:
				if (pane !== undefined) {
					model.endScalePrice(pane, pane.priceScale);
				}
				break;

			case Region.TimeAxis:
				model.endScaleTime();
				break;
		}

		this.#dragRegion = Region.None;
		this.#dragIndex = -1;
	}

	public click(x: number, y: number): void {
		const hit = this.#hitTest(x, y);
		if (hit.region !== Region.Pane) {
			return;
		}

		if (this.onClick !== null) {
			this.#flush();
			const index = this.#model.crosshair().index;
			this.onClick(Number.isNaN(index) ? null : index, { x: hit.x, y: hit.y });
		}

		if (this.#exitTrackingModeOnNextTry) {
			this.#trackStart = null;
			this.#model.clearCrosshairPosition();
		}
	}

	public doubleClick(x: number, y: number): void {
		if (!this.#options.handleScale.axisDoubleClickReset) {
			return;
		}

		const hit = this.#hitTest(x, y);
		if (hit.region === Region.PriceAxis) {
			const pane = this.#model.panes()[hit.index];
			this.#model.resetPriceScale(pane, pane.priceScale);
		} else if (hit.region === Region.TimeAxis) {
			this.#model.resetTimeScale();
		}
	}

	public longTap(x: number, y: number): void {
		const hit = this.#hitTest(x, y);
		if (hit.region !== Region.Pane) {
			return;
		}

		this.#longTap = true;
		if (this.#trackStart === null) {
			// start the tracking mode: the crosshair appears and the next drags move it
			this.#trackStart = { x: hit.x, y: hit.y };
			this.#exitTrackingModeOnNextTry = false;
			this.#setCrosshair(hit.index, hit.x, hit.y);
			// the crosshair snaps to a bar, so its start position comes from the model
			this.#model.resolveCrosshair();
			const crosshair = this.#model.crosshair();
			this.#trackCrosshairStart = { x: crosshair.x, y: crosshair.y };
			this.#model.updateCrosshair();
		}
	}

	public pinchStart(): void {
		this.#prevPinchScale = 1;
	}

	public pinch(centerX: number, scale: number): void {
		if (!this.#options.handleScale.pinch) {
			return;
		}

		const zoomScale = (scale - this.#prevPinchScale) * 5;
		this.#prevPinchScale = scale;
		this.#model.zoomTime(centerX - this.#paneLeft() as Coordinate, zoomScale);
	}

	// ---- pointer helpers

	#hitTest(x: number, y: number): HitResult {
		return hitTest(this.#layout, x, y, SEPARATOR_GRAB_MARGIN, this.#hit);
	}

	#paneLeft(): number {
		return this.#layout.panes[0].left;
	}

	#setCrosshair(paneIndex: number, x: number, y: number): void {
		const rect = this.#layout.panes[paneIndex];
		this.#model.setCrosshairPosition(
			Math.max(0, Math.min(x, rect.width - 1)),
			Math.max(0, Math.min(y, rect.height - 1)),
			this.#model.panes()[paneIndex]
		);
	}

	#setCursor(region: Region, index: number): void {
		let cursor = 'default';
		const handleScale = this.#options.handleScale;
		if (region === Region.Separator) {
			cursor = 'row-resize';
		} else if (region === Region.TimeAxis && handleScale.axisPressedMouseMove) {
			cursor = 'ew-resize';
		} else if (region === Region.PriceAxis && handleScale.axisPressedMouseMove) {
			const priceScale = this.#model.panes()[index].priceScale;
			if (!priceScale.isPercentage() && !priceScale.isIndexedTo100()) {
				cursor = 'ns-resize';
			}
		} else if (region === Region.Pane) {
			cursor = 'crosshair';
		}

		if (this.#element.style.cursor !== cursor) {
			this.#element.style.cursor = cursor;
		}
	}

	#dragPane(pane: Pane, paneIndex: number, x: number, y: number, isTouch: boolean): void {
		const model = this.#model;

		if (this.#trackStart !== null) {
			// tracking mode: the drag moves the crosshair
			this.#exitTrackingModeOnNextTry = false;
			this.#setCrosshair(
				paneIndex,
				this.#trackCrosshairStart.x + (x - this.#trackStart.x),
				this.#trackCrosshairStart.y + (y - this.#trackStart.y)
			);
		} else if (!isTouch) {
			this.#setCrosshair(paneIndex, x, y);
		}

		if (model.timeScale().isEmpty()) {
			return;
		}

		const scrollOptions = this.#options.handleScroll;
		const canScroll = isTouch ? (scrollOptions.horzTouchDrag || scrollOptions.vertTouchDrag) : scrollOptions.pressedMouseMove;
		if (!canScroll) {
			return;
		}

		const priceScale = pane.priceScale;
		const preventScroll = (isTouch && this.#longTap) || this.#trackStart !== null;
		if (Number.isNaN(this.#scrollStartX) && !preventScroll) {
			this.#scrollStartX = x;
			this.#scrollStartY = y;
		}

		if (!this.#isScrolling && !Number.isNaN(this.#scrollStartX) && (this.#scrollStartX !== x || this.#scrollStartY !== y)) {
			if (!priceScale.isEmpty()) {
				model.startScrollPrice(priceScale, y);
			}
			model.startScrollTime(x as Coordinate);
			this.#isScrolling = true;
		}

		if (this.#isScrolling) {
			if (!priceScale.isEmpty()) {
				model.scrollPriceTo(pane, priceScale, y);
			}
			model.scrollTimeTo(x as Coordinate);
		}
	}

	/** Moves the border between pane `index` and pane `index + 1` by `delta` pixels. */
	#dragSeparator(index: number, delta: number): void {
		const heights = this.#separatorStartHeights;
		const total = heights[index] + heights[index + 1];
		const upper = Math.max(MIN_PANE_HEIGHT_ON_RESIZE, Math.min(total - MIN_PANE_HEIGHT_ON_RESIZE, heights[index] + delta));
		if (total < MIN_PANE_HEIGHT_ON_RESIZE * 2) {
			return;
		}

		// the stretch factors become the pixel heights: only their ratio is important
		const panes = this.#model.panes();
		for (let i = 0; i < panes.length; i++) {
			panes[i].stretch = heights[i];
		}
		panes[index].stretch = upper;
		panes[index + 1].stretch = total - upper;
		this.#model.fullUpdate();
	}

	#onWheel(event: WheelEvent): void {
		let deltaX = event.deltaX / 100;
		let deltaY = -(event.deltaY / 100);
		const options = this.#options;

		if ((deltaX === 0 || !options.handleScroll.mouseWheel) &&
			(deltaY === 0 || !options.handleScale.mouseWheel)) {
			return;
		}

		if (event.cancelable) {
			event.preventDefault();
		}

		switch (event.deltaMode) {
			case event.DOM_DELTA_PAGE:
				// one screen at time scroll mode
				deltaX *= 120;
				deltaY *= 120;
				break;

			case event.DOM_DELTA_LINE:
				// one line at time scroll mode
				deltaX *= 32;
				deltaY *= 32;
				break;
		}

		if (deltaY !== 0 && options.handleScale.mouseWheel) {
			const zoomScale = Math.sign(deltaY) * Math.min(1, Math.abs(deltaY));
			const scrollPosition = event.clientX - this.#element.getBoundingClientRect().left - this.#paneLeft();
			this.#model.zoomTime(scrollPosition as Coordinate, zoomScale);
		}

		if (deltaX !== 0 && options.handleScroll.mouseWheel) {
			// 80 is a made up coefficient, and minus is for the "natural" scroll
			this.#model.scrollChart(deltaX * -80 as Coordinate);
		}
	}

	/** Tells the browser which touch drags the page can use for its own scroll. */
	#applyTouchAction(): void {
		const scroll = this.#options.handleScroll;
		let touchAction = 'none';
		if (!scroll.horzTouchDrag && !scroll.vertTouchDrag) {
			touchAction = 'pan-x pan-y';
		} else if (!scroll.vertTouchDrag) {
			touchAction = 'pan-y';
		} else if (!scroll.horzTouchDrag) {
			touchAction = 'pan-x';
		}
		this.#element.style.touchAction = touchAction;
	}

	// ---- size

	#onCanvasResized(entry: ResizeObserverEntry): void {
		let bitmapWidth: number;
		let bitmapHeight: number;
		const pixelRatio = window.devicePixelRatio || 1;

		// the type says that this field always exists, but Safari does not have it
		const exact = entry.devicePixelContentBoxSize as ReadonlyArray<ResizeObserverSize> | undefined;
		if (exact !== undefined && exact.length !== 0) {
			this.#exactBitmapSize = true;
			bitmapWidth = exact[0].inlineSize;
			bitmapHeight = exact[0].blockSize;
		} else {
			bitmapWidth = Math.round(this.#width * pixelRatio);
			bitmapHeight = Math.round(this.#height * pixelRatio);
		}

		if (bitmapWidth !== this.#bitmapWidth || bitmapHeight !== this.#bitmapHeight || pixelRatio !== this.#pixelRatio) {
			this.#bitmapWidth = bitmapWidth;
			this.#bitmapHeight = bitmapHeight;
			this.#pixelRatio = pixelRatio;
			this.#model.fullUpdate();
		}
	}

	// ---- frame loop

	#invalidate(mask: InvalidateMask): void {
		if (this.#preparing) {
			// the frame that is in progress draws after this change
			return;
		}

		if (this.#invalidateMask !== null) {
			this.#invalidateMask.merge(mask);
		} else {
			this.#invalidateMask = mask;
		}

		if (this.#rafId === 0) {
			this.#rafId = requestAnimationFrame(() => {
				this.#rafId = 0;
				this.#flush();
			});
		}
	}

	/** Draws the pending changes now, if there are some. */
	#flush(): void {
		// take ownership of the mask before the draw: a change during the draw makes a new mask
		const mask = this.#invalidateMask;
		if (mask !== null) {
			this.#invalidateMask = null;
			this.#draw(mask);
		}
	}

	#draw(mask: InvalidateMask): void {
		const level = mask.fullInvalidation();
		const model = this.#model;

		if (level > InvalidationLevel.Cursor) {
			// changes that this step makes in the model are drawn by this frame
			this.#preparing = true;
			try {
				const panes = model.panes();
				for (let i = 0; i < panes.length; i++) {
					if (mask.invalidateForPane(i).autoScale) {
						panes[i].momentaryAutoScale();
					}
				}

				if (mask.getFitContent()) {
					model.timeScale().fitContent();
				}

				const targetTimeRange = mask.getTargetTimeRange();
				if (targetTimeRange !== null) {
					model.timeScale().setTimeRange(targetTimeRange);
				}

				// between full updates the price axis only grows, so that it does not jump during a scroll
				const minAxisWidth = level === InvalidationLevel.Full ? 0 : layoutPriceAxisWidth(this.#layout);
				this.#layout = layoutChart(this.#staticCtx, model, this.#width, this.#height, minAxisWidth);
			} finally {
				this.#preparing = false;
			}

			for (const canvas of [this.#staticCanvas, this.#overlayCanvas]) {
				if (canvas.width !== this.#bitmapWidth || canvas.height !== this.#bitmapHeight) {
					canvas.width = this.#bitmapWidth;
					canvas.height = this.#bitmapHeight;
				}
			}
		}

		// one calculation of the crosshair for each frame, and at most one event
		const crosshairChanged = model.resolveCrosshair();

		if (level > InvalidationLevel.Cursor) {
			drawStatic(this.#staticCtx, model, this.#layout, this.#pixelRatio);
		}

		this.#overlayCtx.clearRect(0, 0, this.#bitmapWidth, this.#bitmapHeight);
		drawOverlay(this.#overlayCtx, model, this.#layout, this.#pixelRatio);

		if (crosshairChanged && this.onCrosshairMove !== null) {
			const crosshair = model.crosshair();
			if (crosshair.pane === null) {
				this.onCrosshairMove(null, null);
			} else {
				this.onCrosshairMove(Number.isNaN(crosshair.index) ? null : crosshair.index, { x: crosshair.originX, y: crosshair.originY });
			}
		}
	}
}
