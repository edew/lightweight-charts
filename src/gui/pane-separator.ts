import type { IDestroyable } from '../helpers/idestroyable';
import { clamp } from '../helpers/mathex';

import { createPreconfiguredCanvas, getContext2D, Size } from './canvas-utils';
import { ChartWidget } from './chart-widget';
import { MouseEventHandler, type MouseEventHandlers, type TouchMouseEvent } from './mouse-event-handler';
import { PaneWidget } from './pane-widget';

export const SEPARATOR_HEIGHT = 1;

export class PaneSeparator implements IDestroyable {
	readonly #chartWidget: ChartWidget;
	readonly #rowElement: HTMLTableRowElement;
	readonly #cell: HTMLTableCellElement;
	readonly #handle: HTMLDivElement | null;
	readonly #mouseEventHandler: MouseEventHandler | null;
	readonly #paneA: PaneWidget;
	readonly #paneB: PaneWidget;

	#startY: number = 0;
	#deltaY: number = 0;
	#totalHeight: number = 0;
	#totalStretch: number = 0;
	#minPaneHeight: number = 0;
	#maxPaneHeight: number = 0;
	#pixelStretchFactor: number = 0;

	public constructor(chartWidget: ChartWidget, topPaneIndex: number, bottomPaneIndex: number, disableResize: boolean) {
		this.#chartWidget = chartWidget;
		this.#paneA = chartWidget.paneWidgets()[topPaneIndex];
		this.#paneB = chartWidget.paneWidgets()[bottomPaneIndex];

		this.#rowElement = document.createElement('tr');
		this.#rowElement.style.height = SEPARATOR_HEIGHT + 'px';

		this.#cell = document.createElement('td');
		this.#cell.style.padding = '0';
		this.#cell.setAttribute('colspan', '3');

		this.#updateBorderColor();
		this.#rowElement.appendChild(this.#cell);

		if (disableResize) {
			this.#handle = null;
			this.#mouseEventHandler = null;
		} else {
			this.#handle = document.createElement('div');
			this.#handle.style.position = 'absolute';
			this.#handle.style.zIndex = '50';
			this.#handle.style.height = '5px';
			this.#handle.style.width = '100%';
			this.#handle.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
			this.#handle.style.cursor = 'ns-resize';
			this.#cell.appendChild(this.#handle);
			const handlers: MouseEventHandlers = {
				mouseDownEvent: this.#mouseDownEvent.bind(this),
				pressedMouseMoveEvent: this.#pressedMouseMoveEvent.bind(this),
				mouseUpEvent: this.#mouseUpEvent.bind(this),
			};
			this.#mouseEventHandler = new MouseEventHandler(
				this.#handle,
				handlers,
				{
					treatVertTouchDragAsPageScroll: false,
					treatHorzTouchDragAsPageScroll: true,
				}
			);
		}
	}

	public destroy(): void {
		if (this.#mouseEventHandler !== null) {
			this.#mouseEventHandler.destroy();
		}
	}

	public getElement(): HTMLElement {
		return this.#rowElement;
	}

	public getSize(): Readonly<Size> {
		return new Size(this.#paneA.getSize().w, SEPARATOR_HEIGHT);
	}

	public getImage(): HTMLCanvasElement {
		const size = this.getSize();
		const res = createPreconfiguredCanvas(document, size);
		const ctx = getContext2D(res);
		ctx.fillStyle = this.#chartWidget.options().timeScale.borderColor;
		ctx.fillRect(0, 0, size.w, size.h);
		return res;
	}

	public update(): void {
		this.#updateBorderColor();
	}

	#updateBorderColor(): void {
		this.#cell.style.background = this.#chartWidget.options().timeScale.borderColor;
	}

	#mouseDownEvent(event: TouchMouseEvent): void {
		this.#startY = event.pageY;
		this.#deltaY = 0;
		this.#totalHeight = this.#paneA.getSize().h + this.#paneB.getSize().h;
		this.#totalStretch = this.#paneA.stretchFactor() + this.#paneB.stretchFactor();
		this.#minPaneHeight = 30;
		this.#maxPaneHeight = this.#totalHeight - this.#minPaneHeight;
		this.#pixelStretchFactor = this.#totalStretch / this.#totalHeight;
	}

	#pressedMouseMoveEvent(event: TouchMouseEvent): void {
		this.#deltaY = (event.pageY - this.#startY);
		const upperHeight = this.#paneA.getSize().h;
		const newUpperPaneHeight = clamp(upperHeight + this.#deltaY, this.#minPaneHeight, this.#maxPaneHeight);

		const newUpperPaneStretch = newUpperPaneHeight * this.#pixelStretchFactor;
		const newLowerPaneStretch = this.#totalStretch - newUpperPaneStretch;
		this.#paneA.setStretchFactor(newUpperPaneStretch);
		this.#paneB.setStretchFactor(newLowerPaneStretch);

		this.#chartWidget.adjustSize();

		if (this.#paneA.getSize().h !== upperHeight) {
			this.#startY = event.pageY;
		}
	}

	#mouseUpEvent(event: TouchMouseEvent): void {
		this.#startY = 0;
		this.#deltaY = 0;
		this.#totalHeight = 0;
		this.#totalStretch = 0;
		this.#minPaneHeight = 0;
		this.#maxPaneHeight = 0;
		this.#pixelStretchFactor = 0;
	}
}
