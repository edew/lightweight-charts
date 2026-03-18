import { ensureDefined, ensureNotNull } from '../helpers/assertions';
import { drawScaled } from '../helpers/canvas-helpers';
import { Delegate } from '../helpers/delegate';
import type { IDestroyable } from '../helpers/idestroyable';
import type { ISubscription } from '../helpers/isubscription';
import type { DeepPartial } from '../helpers/strict-type-checks';

import type { BarPrice, BarPrices } from '../model/bar';
import { ChartModel, type ChartOptionsInternal } from '../model/chart-model';
import type { Coordinate } from '../model/coordinate';
import { InvalidateMask, InvalidationLevel } from '../model/invalidate-mask';
import type { Point } from '../model/point';
import { Series } from '../model/series';
import type { TimePoint, TimePointIndex } from '../model/time-scale/time-data';

import { createPreconfiguredCanvas, getCanvasDevicePixelRatio, getContext2D, Size } from './canvas-utils';
import { PaneSeparator, SEPARATOR_HEIGHT } from './pane-separator';
import { PaneWidget } from './pane-widget';
import { TimeAxisWidget } from './time-axis-widget';

export interface MouseEventParamsImpl {
	time?: TimePoint;
	point?: Point;
	seriesPrices: Map<Series, BarPrice | BarPrices>;
	hoveredSeries?: Series;
	hoveredObject?: string;
}

export type MouseEventParamsImplSupplier = () => MouseEventParamsImpl;

export class ChartWidget implements IDestroyable {
	readonly #options: ChartOptionsInternal;
	#paneWidgets: PaneWidget[] = [];
	#paneSeparators: PaneSeparator[] = [];
	readonly #model: ChartModel;
	#drawRafId: number = 0;
	readonly #priceAxisWidthChanged: Delegate<number> = new Delegate();
	#height: number = 0;
	#width: number = 0;
	#priceAxisWidth: number = 0;
	#element: HTMLElement;
	readonly #tableElement: HTMLElement;
	#timeAxisWidget: TimeAxisWidget;
	#invalidateMask: InvalidateMask | null = null;
	#drawPlanned: boolean = false;
	#clicked: Delegate<MouseEventParamsImplSupplier> = new Delegate();
	#crosshairMoved: Delegate<MouseEventParamsImplSupplier> = new Delegate();
	#onWheelBound: (event: WheelEvent) => void;

	public constructor(container: HTMLElement, options: ChartOptionsInternal) {
		this.#options = options;

		this.#element = document.createElement('div');
		this.#element.classList.add('tv-lightweight-charts');
		this.#element.style.overflow = 'hidden';
		this.#element.style.width = '100%';
		this.#element.style.height = '100%';

		this.#tableElement = document.createElement('table');
		this.#tableElement.setAttribute('cellspacing', '0');
		this.#element.appendChild(this.#tableElement);

		this.#onWheelBound = this.#onMousewheel.bind(this);
		this.#element.addEventListener('wheel', this.#onWheelBound, { passive: false });

		this.#model = new ChartModel(
			this.#invalidateHandler.bind(this),
			this.#options
		);
		this.model().crosshairMoved().subscribe(this.#onPaneWidgetCrosshairMoved.bind(this), this);

		this.#timeAxisWidget = new TimeAxisWidget(this);
		this.#tableElement.appendChild(this.#timeAxisWidget.getElement());

		let width = this.#options.width;
		let height = this.#options.height;

		if (width === 0 && height === 0) {
			const containerRect = container.getBoundingClientRect();
			// TODO: Fix it better
			// on Hi-DPI CSS size * Device Pixel Ratio should be integer to avoid smoothing
			// For chart widget we decreases because we must be inside container.
			// For time axis this is not important, since it just affects space for pane widgets
			width = Math.floor(containerRect.width);
			if (width % 2) {
				width -= 1;
			}
			height = Math.floor(containerRect.height);
			if (height % 2) {
				height -= 1;
			}
		}

		width = Math.max(70, width);
		height = Math.max(50, height);

		// BEWARE: resize must be called BEFORE _syncGuiWithModel (in constructor only)
		// or after but with adjustSize to properly update time scale
		this.resize(width, height);

		this.#syncGuiWithModel();

		container.appendChild(this.#element);
		this.#updateTimeAxisVisibility();
		this.#model.timeScale().optionsApplied().subscribe(
			() => {
				this.#updateTimeAxisVisibility();
				this.adjustSize();
			},
			this
		);
	}

	public model(): ChartModel {
		return this.#model;
	}

	public options(): Readonly<ChartOptionsInternal> {
		return this.#options;
	}

	public paneWidgets(): PaneWidget[] {
		return this.#paneWidgets;
	}

	public destroy(): void {
		this.#element.removeEventListener('wheel', this.#onWheelBound);
		if (this.#drawRafId !== 0) {
			window.cancelAnimationFrame(this.#drawRafId);
		}

		this.#model.crosshairMoved().unsubscribeAll(this);
		this.#model.timeScale().optionsApplied().unsubscribeAll(this);
		this.#model.destroy();

		for (const paneWidget of this.#paneWidgets) {
			this.#tableElement.removeChild(paneWidget.getElement());
			paneWidget.clicked().unsubscribeAll(this);
			paneWidget.destroy();
		}
		this.#paneWidgets = [];

		for (const paneSeparator of this.#paneSeparators) {
			this.#destroySeparator(paneSeparator);
		}
		this.#paneSeparators = [];

		ensureNotNull(this.#timeAxisWidget).destroy();

		if (this.#element.parentElement !== null) {
			this.#element.parentElement.removeChild(this.#element);
		}

		this.#crosshairMoved.destroy();
		this.#clicked.destroy();

		(this.#element as unknown as null) = null;
	}

	public resize(width: number, height: number, forceRepaint: boolean = false): void {
		if (this.#height === height && this.#width === width) {
			return;
		}

		this.#height = height;
		this.#width = width;

		const heightStr = height + 'px';
		const widthStr = width + 'px';

		ensureNotNull(this.#element).style.height = heightStr;
		ensureNotNull(this.#element).style.width = widthStr;

		this.#tableElement.style.height = heightStr;
		this.#tableElement.style.width = widthStr;

		if (forceRepaint) {
			this.#drawImpl(new InvalidateMask(InvalidationLevel.Full));
		} else {
			this.#model.fullUpdate();
		}
	}

	public paint(invalidateMask?: InvalidateMask): void {
		if (invalidateMask === undefined) {
			invalidateMask = new InvalidateMask(InvalidationLevel.Full);
		}

		for (let i = 0; i < this.#paneWidgets.length; i++) {
			this.#paneWidgets[i].paint(invalidateMask.invalidateForPane(i).level);
		}

		this.#timeAxisWidget.paint(invalidateMask.fullInvalidation());
	}

	public adjustSize(): void {
		this.#adjustSizeImpl();
		this.#model.fullUpdate();
	}

	public applyOptions(options: DeepPartial<ChartOptionsInternal>): void {
		this.#model.applyOptions(options);
		this.#updateTimeAxisVisibility();

		const width = options.width || this.#width;
		const height = options.height || this.#height;

		this.resize(width, height);
	}

	public clicked(): ISubscription<MouseEventParamsImplSupplier> {
		return this.#clicked;
	}

	public crosshairMoved(): ISubscription<MouseEventParamsImplSupplier> {
		return this.#crosshairMoved;
	}

	public takeScreenshot(): HTMLCanvasElement {
		if (this.#invalidateMask !== null) {
			this.#drawImpl(this.#invalidateMask);
			this.#invalidateMask = null;
		}
		// calculate target size
		const firstPane = this.#paneWidgets[0];
		const targetCanvas = createPreconfiguredCanvas(document, new Size(this.#width, this.#height));
		const ctx = getContext2D(targetCanvas);
		const pixelRatio = getCanvasDevicePixelRatio(targetCanvas);
		drawScaled(ctx, pixelRatio, () => {
			let targetX = 0;
			let targetY = 0;

			const drawPriceAxises = () => {
				for (let paneIndex = 0; paneIndex < this.#paneWidgets.length; paneIndex++) {
					const paneWidget = this.#paneWidgets[paneIndex];
					const paneWidgetHeight = paneWidget.getSize().h;
					const priceAxisWidget = ensureNotNull(paneWidget.priceAxisWidget());
					const image = priceAxisWidget.getImage();
					ctx.drawImage(image, targetX, targetY, priceAxisWidget.getWidth(), paneWidgetHeight);
					targetY += paneWidgetHeight;
					if (paneIndex < this.#paneWidgets.length - 1) {
						targetY += SEPARATOR_HEIGHT;
					}
				}
			};
			// draw left price scale if exists
			if (this.#options.priceScale.position === 'left') {
				drawPriceAxises();
				targetX = ensureNotNull(firstPane.priceAxisWidget()).getWidth();
			}
			targetY = 0;
			for (let paneIndex = 0; paneIndex < this.#paneWidgets.length; paneIndex++) {
				const paneWidget = this.#paneWidgets[paneIndex];
				const paneWidgetSize = paneWidget.getSize();
				const image = paneWidget.getImage();
				ctx.drawImage(image, targetX, targetY, paneWidgetSize.w, paneWidgetSize.h);
				targetY += paneWidgetSize.h;
				if (paneIndex < this.#paneWidgets.length - 1) {
					const separator = this.#paneSeparators[paneIndex];
					const separatorSize = separator.getSize();
					const separatorImage = separator.getImage();
					ctx.drawImage(separatorImage, targetX, targetY, separatorSize.w, separatorSize.h);
					targetY += separatorSize.h;
				}
			}
			targetX += firstPane.getSize().w;
			if (this.#options.priceScale.position === 'right') {
				targetY = 0;
				drawPriceAxises();
			}
			const drawStub = () => {
				const stub = ensureNotNull(this.#timeAxisWidget.stub());
				const size = stub.getSize();
				const image = stub.getImage();
				ctx.drawImage(image, targetX, targetY, size.w, size.h);
			};
			// draw time scale
			if (this.#options.timeScale.visible) {
				targetX = 0;
				if (this.#options.priceScale.position === 'left') {
					drawStub();
					targetX = ensureNotNull(firstPane.priceAxisWidget()).getWidth();
				}
				const size = this.#timeAxisWidget.getSize();
				const image = this.#timeAxisWidget.getImage();
				ctx.drawImage(image, targetX, targetY, size.w, size.h);
				if (this.#options.priceScale.position === 'right') {
					targetX = firstPane.getSize().w;
					drawStub();
					ctx.restore();
				}
			}
		});
		return targetCanvas;
	}

	#adjustSizeImpl(): void {
		let totalStretch = 0;
		let priceAxisWidth = 0;

		for (const paneWidget of this.#paneWidgets) {
			if (this.#options.priceScale.position !== 'none') {
				priceAxisWidth = Math.max(priceAxisWidth, ensureNotNull(paneWidget.priceAxisWidget()).optimalWidth());
			}

			totalStretch += paneWidget.stretchFactor();
		}

		const width = this.#width;
		const height = this.#height;

		const paneWidth = Math.max(width - priceAxisWidth, 0);

		const separatorCount = this.#paneSeparators.length;
		const separatorHeight = SEPARATOR_HEIGHT;
		const separatorsHeight = separatorHeight * separatorCount;
		let timeAxisHeight = this.#options.timeScale.visible ? this.#timeAxisWidget.optimalHeight() : 0;
		// TODO: Fix it better
		// on Hi-DPI CSS size * Device Pixel Ratio should be integer to avoid smoothing
		if (timeAxisHeight % 2) {
			timeAxisHeight += 1;
		}
		const otherWidgetHeight = separatorsHeight + timeAxisHeight;
		const totalPaneHeight = height < otherWidgetHeight ? 0 : height - otherWidgetHeight;
		const stretchPixels = totalPaneHeight / totalStretch;

		let accumulatedHeight = 0;
		for (let paneIndex = 0; paneIndex < this.#paneWidgets.length; ++paneIndex) {
			const paneWidget = this.#paneWidgets[paneIndex];
			paneWidget.setState(this.#model.panes()[paneIndex]);

			let paneHeight = 0;
			let calculatePaneHeight = 0;

			if (paneIndex === this.#paneWidgets.length - 1) {
				calculatePaneHeight = totalPaneHeight - accumulatedHeight;
			} else {
				calculatePaneHeight = Math.round(paneWidget.stretchFactor() * stretchPixels);
			}

			paneHeight = Math.max(calculatePaneHeight, 2);

			accumulatedHeight += paneHeight;

			paneWidget.setSize(new Size(paneWidth, paneHeight));
			if (this.#options.priceScale.position !== 'none') {
				paneWidget.setPriceAxisSize(priceAxisWidth);
			}

			if (paneWidget.state()) {
				this.#model.setPaneHeight(paneWidget.state(), paneHeight);
			}
		}

		this.#timeAxisWidget.setSizes(
			new Size(paneWidth, timeAxisHeight),
			priceAxisWidth
		);

		this.#model.setWidth(paneWidth);
		if (this.#priceAxisWidth !== priceAxisWidth) {
			this.#priceAxisWidth = priceAxisWidth;
			this.#priceAxisWidthChanged.fire(priceAxisWidth);
		}
	}

	#onMousewheel(event: WheelEvent): void {
		let deltaX = event.deltaX / 100;
		let deltaY = -(event.deltaY / 100);

		if ((deltaX === 0 || !this.#options.handleScroll.mouseWheel) &&
			(deltaY === 0 || !this.#options.handleScale.mouseWheel)) {
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

		if (deltaY !== 0 && this.#options.handleScale.mouseWheel) {
			const zoomScale = Math.sign(deltaY) * Math.min(1, Math.abs(deltaY));
			const scrollPosition = event.clientX - this.#element.getBoundingClientRect().left;
			this.model().zoomTime(scrollPosition as Coordinate, zoomScale);
		}

		if (deltaX !== 0 && this.#options.handleScroll.mouseWheel) {
			this.model().scrollChart(deltaX * -80 as Coordinate); // 80 is a made up coefficient, and minus is for the "natural" scroll
		}
	}

	#drawImpl(invalidateMask: InvalidateMask): void {
		const invalidationType = invalidateMask.fullInvalidation();

		// actions for full invalidation ONLY (not shared with light)
		if (invalidationType === InvalidationLevel.Full) {
			this.#syncGuiWithModel();
		}

		// light or full invalidate actions
		if (
			invalidationType === InvalidationLevel.Full ||
			invalidationType === InvalidationLevel.Light
		) {
			const panes = this.#model.panes();
			for (let i = 0; i < panes.length; i++) {
				if (invalidateMask.invalidateForPane(i).autoScale) {
					panes[i].momentaryAutoScale();
				}
			}

			if (invalidateMask.getFitContent()) {
				this.#model.timeScale().fitContent();
			}

			const targetTimeRange = invalidateMask.getTargetTimeRange();
			if (targetTimeRange !== null) {
				this.#model.timeScale().setTimePointsRange(targetTimeRange);
			}

			this.#timeAxisWidget.update();
		}

		this.paint(invalidateMask);
	}

	#invalidateHandler(invalidateMask: InvalidateMask): void {
		if (this.#invalidateMask !== null) {
			this.#invalidateMask.merge(invalidateMask);
		} else {
			this.#invalidateMask = invalidateMask;
		}

		if (!this.#drawPlanned) {
			this.#drawPlanned = true;
			this.#drawRafId = window.requestAnimationFrame(() => {
				this.#drawPlanned = false;
				this.#drawRafId = 0;

				if (this.#invalidateMask !== null) {
					this.#drawImpl(this.#invalidateMask);
					this.#invalidateMask = null;
				}
			});
		}
	}

	#destroySeparator(separator: PaneSeparator): void {
		this.#tableElement.removeChild(separator.getElement());
		separator.destroy();
	}

	#syncGuiWithModel(): void {
		const panes = this.#model.panes();
		const targetPaneWidgetsCount = panes.length;
		const actualPaneWidgetsCount = this.#paneWidgets.length;

		// Remove (if needed) pane widgets and separators
		for (let i = targetPaneWidgetsCount; i < actualPaneWidgetsCount; i++) {
			const paneWidget = ensureDefined(this.#paneWidgets.pop());
			this.#tableElement.removeChild(paneWidget.getElement());
			paneWidget.clicked().unsubscribeAll(this);
			paneWidget.destroy();

			const paneSeparator = this.#paneSeparators.pop();
			if (paneSeparator !== undefined) {
				this.#destroySeparator(paneSeparator);
			}
		}

		// Create (if needed) new pane widgets and separators
		for (let i = actualPaneWidgetsCount; i < targetPaneWidgetsCount; i++) {
			const paneWidget = new PaneWidget(this, panes[i]);
			paneWidget.clicked().subscribe(this.#onPaneWidgetClicked.bind(this), this);

			this.#paneWidgets.push(paneWidget);

			// create and insert separator
			if (i > 1) {
				const paneSeparator = new PaneSeparator(this, i - 1, i, true);
				this.#paneSeparators.push(paneSeparator);
				this.#tableElement.insertBefore(paneSeparator.getElement(), this.#timeAxisWidget.getElement());
			}

			// insert paneWidget
			this.#tableElement.insertBefore(paneWidget.getElement(), this.#timeAxisWidget.getElement());
		}

		for (let i = 0; i < targetPaneWidgetsCount; i++) {
			const state = panes[i];
			const paneWidget = this.#paneWidgets[i];
			if (paneWidget.state() !== state) {
				paneWidget.setState(state);
			} else {
				paneWidget.updatePriceAxisWidget();
			}
		}

		this.#updateTimeAxisVisibility();
		this.#adjustSizeImpl();
	}

	#getMouseEventParamsImpl(time: TimePointIndex | null, point: Point | null): MouseEventParamsImpl {
		const seriesPrices = new Map<Series, BarPrice | BarPrices>();
		if (time !== null) {
			const serieses = this.#model.serieses();
			serieses.forEach((s: Series) => {
				// TODO: replace with search left
				const prices = s.dataAt(time);
				if (prices !== null) {
					seriesPrices.set(s, prices);
				}
			});
		}
		let clientTime: TimePoint | undefined;
		if (time !== null) {
			const timePoint = this.#model.timeScale().indexToUserTime(time);
			if (timePoint !== null) {
				clientTime = timePoint;
			}
		}

		const hoveredSource = this.model().hoveredSource();

		const hoveredSeries = hoveredSource !== null && hoveredSource.source instanceof Series
			? hoveredSource.source
			: undefined;

		const hoveredObject = hoveredSource !== null && hoveredSource.object !== undefined
			? hoveredSource.object.externalId
			: undefined;

		return {
			time: clientTime,
			point: point || undefined,
			hoveredSeries,
			seriesPrices,
			hoveredObject,
		};
	}

	#onPaneWidgetClicked(time: TimePointIndex | null, point: Point): void {
		this.#clicked.fire(() => this.#getMouseEventParamsImpl(time, point));
	}

	#onPaneWidgetCrosshairMoved(time: TimePointIndex | null, point: Point | null): void {
		this.#crosshairMoved.fire(() => this.#getMouseEventParamsImpl(time, point));
	}

	#updateTimeAxisVisibility(): void {
		const display = this.#options.timeScale.visible ? '' : 'none';
		this.#timeAxisWidget.getElement().style.display = display;
	}
}
