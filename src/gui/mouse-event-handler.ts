import { ensure } from '../helpers/assertions';
import type { IDestroyable } from '../helpers/idestroyable';

import { mobileTouch } from './support-touch';

/**
 * The type declares compile-time constants for mouse buttons.
 * e.button values for MouseEvents.
 * It's NOT e.buttons (with s)!
 */
export const enum MouseEventButton {
	Left = 0,
	Middle = 1,
	Right = 2,
	Fourth = 3,
	Fifth = 4,
}

export type HandlerEventCallback = (event: TouchMouseEvent) => void;
export type EmptyCallback = () => void;
export type PinchEventCallback = (middlePoint: Position, scale: number) => void;

export interface MouseEventHandlers {
	pinchStartEvent?: EmptyCallback;
	pinchEvent?: PinchEventCallback;
	pinchEndEvent?: EmptyCallback;
	mouseClickEvent?: HandlerEventCallback;
	mouseDoubleClickEvent?: HandlerEventCallback;
	mouseDownEvent?: HandlerEventCallback;
	mouseDownOutsideEvent?: EmptyCallback;
	mouseEnterEvent?: HandlerEventCallback;
	mouseLeaveEvent?: HandlerEventCallback;
	mouseMoveEvent?: HandlerEventCallback;
	mouseUpEvent?: HandlerEventCallback;
	pressedMouseMoveEvent?: HandlerEventCallback;
	longTapEvent?: HandlerEventCallback;
}

export interface TouchMouseEvent {
	readonly clientX: number;
	readonly clientY: number;
	readonly pageX: number;
	readonly pageY: number;
	readonly screenX: number;
	readonly screenY: number;
	readonly localX: number;
	readonly localY: number;

	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly shiftKey: boolean;
	readonly metaKey: boolean;

	// TODO: remove this after rewriting MouseEventHandler to handle touch and mouse event separately
	readonly type: 'touch' | 'mouse';

	target: MouseEvent['target'];
	view: MouseEvent['view'];
}

export interface Position {
	x: number;
	y: number;
}

// we can use `const name = 500;` but with `const enum` this values will be inlined into code
// so we do not need to have it as variables
const enum Delay {
	ResetClick = 500,
	LongTap = 240,
}

export interface MouseEventHandlerOptions {
	treatVertTouchDragAsPageScroll: boolean;
	treatHorzTouchDragAsPageScroll: boolean;
}

// TODO: get rid of a lot of boolean flags, probably we should replace it with some enum
export class MouseEventHandler implements IDestroyable {
	readonly #target: HTMLElement;
	#handler: MouseEventHandlers;

	readonly #options: MouseEventHandlerOptions;

	#clickCount: number = 0;
	#clickTimeoutId: TimerId | null = null;
	#longTapTimeoutId: TimerId | null = null;
	#longTapActive: boolean = false;
	#mouseMoveStartPosition: Position | null = null;
	#moveExceededManhattanDistance: boolean = false;
	#cancelClick: boolean = false;
	#unsubscribeOutsideEvents: (() => void) | null = null;
	#unsubscribeMousemove: (() => void) | null = null;
	#unsubscribeRoot: (() => void) | null = null;

	#startPinchMiddlePoint: Position | null = null;
	#startPinchDistance: number = 0;
	#pinchPrevented: boolean = false;
	#preventDragProcess: boolean = false;

	#mousePressed: boolean = false;

	public constructor(
		target: HTMLElement,
		handler: MouseEventHandlers,
		options: MouseEventHandlerOptions
	) {
		this.#target = target;
		this.#handler = handler;
		this.#options = options;

		this.#init();
	}

	public destroy(): void {
		if (this.#unsubscribeOutsideEvents !== null) {
			this.#unsubscribeOutsideEvents();
			this.#unsubscribeOutsideEvents = null;
		}

		if (this.#unsubscribeMousemove !== null) {
			this.#unsubscribeMousemove();
			this.#unsubscribeMousemove = null;
		}

		if (this.#unsubscribeRoot !== null) {
			this.#unsubscribeRoot();
			this.#unsubscribeRoot = null;
		}

		this.#clearLongTapTimeout();
		this.#resetClickTimeout();
	}

	#mouseEnterHandler(enterEvent: MouseEvent | TouchEvent): void {
		if (this.#unsubscribeMousemove) {
			this.#unsubscribeMousemove();
		}

		{
			const boundMouseMoveHandler = this.#mouseMoveHandler.bind(this);
			this.#unsubscribeMousemove = () => {
				this.#target.removeEventListener('mousemove', boundMouseMoveHandler);
			};
			this.#target.addEventListener('mousemove', boundMouseMoveHandler);
		}

		if (isTouchEvent(enterEvent)) {
			this.#mouseMoveHandler(enterEvent);
		}

		const compatEvent = this.#makeCompatEvent(enterEvent);
		this.#processEvent(compatEvent, this.#handler.mouseEnterEvent);
	}

	#resetClickTimeout(): void {
		if (this.#clickTimeoutId !== null) {
			clearTimeout(this.#clickTimeoutId);
		}

		this.#clickCount = 0;
		this.#clickTimeoutId = null;
	}

	#mouseMoveHandler(moveEvent: MouseEvent | TouchEvent): void {
		if (this.#mousePressed && !isTouchEvent(moveEvent)) {
			return;
		}

		const compatEvent = this.#makeCompatEvent(moveEvent);
		this.#processEvent(compatEvent, this.#handler.mouseMoveEvent);
	}

	#mouseMoveWithDownHandler(moveEvent: MouseEvent | TouchEvent): void {
		if ('button' in moveEvent && moveEvent.button !== MouseEventButton.Left) {
			return;
		}

		if (this.#startPinchMiddlePoint !== null) {
			return;
		}

		const isTouch = isTouchEvent(moveEvent);
		if (this.#preventDragProcess && isTouch) {
			return;
		}

		// prevent pinch if move event comes faster than the second touch
		this.#pinchPrevented = true;

		const compatEvent = this.#makeCompatEvent(moveEvent);

		const startMouseMovePos = ensure(this.#mouseMoveStartPosition);
		const xOffset = Math.abs(startMouseMovePos.x - compatEvent.pageX);
		const yOffset = Math.abs(startMouseMovePos.y - compatEvent.pageY);

		const moveExceededManhattanDistance = xOffset + yOffset > 5;

		if (!moveExceededManhattanDistance && isTouch) {
			return;
		}

		if (moveExceededManhattanDistance && !this.#moveExceededManhattanDistance && isTouch) {
			// vertical drag is more important than horizontal drag
			// because we scroll the page vertically often than horizontally
			const correctedXOffset = xOffset * 0.5;

			// a drag can be only if touch page scroll isn't allowed
			const isVertDrag = yOffset >= correctedXOffset && !this.#options.treatVertTouchDragAsPageScroll;
			const isHorzDrag = correctedXOffset > yOffset && !this.#options.treatHorzTouchDragAsPageScroll;

			// if drag event happened then we should revert preventDefault state to original one
			// and try to process the drag event
			// else we shouldn't prevent default of the event and ignore processing the drag event
			if (!isVertDrag && !isHorzDrag) {
				this.#preventDragProcess = true;
			}
		}

		if (moveExceededManhattanDistance) {
			this.#moveExceededManhattanDistance = true;

			// if manhattan distance is more that 5 - we should cancel click event
			this.#cancelClick = true;

			if (isTouch) {
				this.#clearLongTapTimeout();
			}
		}

		if (!this.#preventDragProcess) {
			this.#processEvent(compatEvent, this.#handler.pressedMouseMoveEvent);

			// we should prevent default in case of touch only
			// to prevent scroll of the page
			if (isTouch) {
				preventDefault(moveEvent);
			}
		}
	}

	#mouseUpHandler(mouseUpEvent: MouseEvent | TouchEvent): void {
		if ('button' in mouseUpEvent && mouseUpEvent.button !== MouseEventButton.Left) {
			return;
		}

		const compatEvent = this.#makeCompatEvent(mouseUpEvent);

		this.#clearLongTapTimeout();

		this.#mouseMoveStartPosition = null;

		this.#mousePressed = false;

		if (this.#unsubscribeRoot) {
			this.#unsubscribeRoot();
			this.#unsubscribeRoot = null;
		}

		if (isTouchEvent(mouseUpEvent)) {
			this.#mouseLeaveHandler(mouseUpEvent);
		}

		this.#processEvent(compatEvent, this.#handler.mouseUpEvent);
		++this.#clickCount;
		if (this.#clickTimeoutId && this.#clickCount > 1) {
			this.#processEvent(compatEvent, this.#handler.mouseDoubleClickEvent);
			this.#resetClickTimeout();
		} else {
			if (!this.#cancelClick) {
				this.#processEvent(compatEvent, this.#handler.mouseClickEvent);
			}
		}

		// prevent safari's dblclick-to-zoom
		// we handle mouseDoubleClickEvent here ourself
		if (isTouchEvent(mouseUpEvent)) {
			preventDefault(mouseUpEvent);

			this.#mouseLeaveHandler(mouseUpEvent);

			if (mouseUpEvent.touches.length === 0) {
				this.#longTapActive = false;
			}
		}
	}

	#clearLongTapTimeout(): void {
		if (this.#longTapTimeoutId === null) {
			return;
		}

		clearTimeout(this.#longTapTimeoutId);
		this.#longTapTimeoutId = null;
	}

	#mouseDownHandler(downEvent: MouseEvent | TouchEvent): void {
		if ('button' in downEvent && downEvent.button !== MouseEventButton.Left) {
			return;
		}

		const compatEvent = this.#makeCompatEvent(downEvent);

		this.#cancelClick = false;
		this.#moveExceededManhattanDistance = false;
		this.#preventDragProcess = false;

		if (isTouchEvent(downEvent)) {
			this.#mouseEnterHandler(downEvent);
		}

		this.#mouseMoveStartPosition = {
			x: compatEvent.pageX,
			y: compatEvent.pageY,
		};

		if (this.#unsubscribeRoot) {
			this.#unsubscribeRoot();
			this.#unsubscribeRoot = null;
		}

		{
			const boundMouseMoveWithDownHandler = this.#mouseMoveWithDownHandler.bind(this);
			const boundMouseUpHandler = this.#mouseUpHandler.bind(this);
			const rootElement = (this.#target.ownerDocument as Document).documentElement;

			this.#unsubscribeRoot = () => {
				rootElement.removeEventListener('touchmove', boundMouseMoveWithDownHandler);
				rootElement.removeEventListener('touchend', boundMouseUpHandler);

				rootElement.removeEventListener('mousemove', boundMouseMoveWithDownHandler);
				rootElement.removeEventListener('mouseup', boundMouseUpHandler);
			};

			rootElement.addEventListener('touchmove', boundMouseMoveWithDownHandler, { passive: false });
			rootElement.addEventListener('touchend', boundMouseUpHandler, { passive: false });

			this.#clearLongTapTimeout();

			if (isTouchEvent(downEvent) && downEvent.touches.length === 1) {
				this.#longTapTimeoutId = setTimeout(this.#longTapHandler.bind(this, downEvent), Delay.LongTap);
			} else {
				rootElement.addEventListener('mousemove', boundMouseMoveWithDownHandler);
				rootElement.addEventListener('mouseup', boundMouseUpHandler);
			}
		}

		this.#mousePressed = true;

		this.#processEvent(compatEvent, this.#handler.mouseDownEvent);

		if (!this.#clickTimeoutId) {
			this.#clickCount = 0;
			this.#clickTimeoutId = setTimeout(this.#resetClickTimeout.bind(this), Delay.ResetClick);
		}
	}

	#init(): void {
		this.#target.addEventListener('mouseenter', this.#mouseEnterHandler.bind(this));

		this.#target.addEventListener('touchcancel', this.#clearLongTapTimeout.bind(this));

		{
			const doc = this.#target.ownerDocument as Document;

			const outsideHandler = (event: MouseEvent | TouchEvent) => {
				if (!this.#handler.mouseDownOutsideEvent) {
					return;
				}
				if (event.target && this.#target.contains(event.target as Element)) {
					return;
				}
				this.#handler.mouseDownOutsideEvent();
			};

			this.#unsubscribeOutsideEvents = () => {
				doc.removeEventListener('mousedown', outsideHandler);
				doc.removeEventListener('touchstart', outsideHandler);
			};

			doc.addEventListener('mousedown', outsideHandler);
			doc.addEventListener('touchstart', outsideHandler, { passive: true });
		}

		this.#target.addEventListener('mouseleave', this.#mouseLeaveHandler.bind(this));

		this.#target.addEventListener('touchstart', this.#mouseDownHandler.bind(this), { passive: true });
		if (!mobileTouch) {
			this.#target.addEventListener('mousedown', this.#mouseDownHandler.bind(this));
		}

		this.#initPinch();

		// Hey mobile Safari, what's up?
		// If mobile Safari doesn't have any touchmove handler with passive=false
		// it treats a touchstart and the following touchmove events as cancelable=false,
		// so we can't prevent them (as soon we subscribe on touchmove inside handler of touchstart).
		// And we'll get scroll of the page along with chart's one instead of only chart's scroll.
		this.#target.addEventListener('touchmove', () => {}, { passive: false });
	}

	#initPinch(): void {
		if (this.#handler.pinchStartEvent === undefined &&
			this.#handler.pinchEvent === undefined &&
			this.#handler.pinchEndEvent === undefined
		) {
			return;
		}

		this.#target.addEventListener(
			'touchstart',
			(event: TouchEvent) => this.#checkPinchState(event.touches),
			{ passive: true }
		);

		this.#target.addEventListener(
			'touchmove',
			(event: TouchEvent) => {
				if (event.touches.length !== 2 || this.#startPinchMiddlePoint === null) {
					return;
				}

				if (this.#handler.pinchEvent !== undefined) {
					const currentDistance = getDistance(event.touches[0], event.touches[1]);
					const scale = currentDistance / this.#startPinchDistance;
					this.#handler.pinchEvent(this.#startPinchMiddlePoint, scale);
					preventDefault(event);
				}
			},
			{ passive: false }
		);

		this.#target.addEventListener('touchend', (event: TouchEvent) => {
			this.#checkPinchState(event.touches);
		});
	}

	#checkPinchState(touches: TouchList): void {
		if (touches.length === 1) {
			this.#pinchPrevented = false;
		}

		if (touches.length !== 2 || this.#pinchPrevented || this.#longTapActive) {
			this.#stopPinch();
		} else {
			this.#startPinch(touches);
		}
	}

	#startPinch(touches: TouchList): void {
		const box = getBoundingClientRect(this.#target);
		this.#startPinchMiddlePoint = {
			x: ((touches[0].clientX - box.left) + (touches[1].clientX - box.left)) / 2,
			y: ((touches[0].clientY - box.top) + (touches[1].clientY - box.top)) / 2,
		};

		this.#startPinchDistance = getDistance(touches[0], touches[1]);

		if (this.#handler.pinchStartEvent !== undefined) {
			this.#handler.pinchStartEvent();
		}

		this.#clearLongTapTimeout();
	}

	#stopPinch(): void {
		if (this.#startPinchMiddlePoint === null) {
			return;
		}

		this.#startPinchMiddlePoint = null;

		if (this.#handler.pinchEndEvent !== undefined) {
			this.#handler.pinchEndEvent();
		}
	}

	#mouseLeaveHandler(event: MouseEvent | TouchEvent): void {
		if (this.#unsubscribeMousemove) {
			this.#unsubscribeMousemove();
		}
		const compatEvent = this.#makeCompatEvent(event);
		this.#processEvent(compatEvent, this.#handler.mouseLeaveEvent);
	}

	#longTapHandler(event: TouchEvent): void {
		const compatEvent = this.#makeCompatEvent(event);
		this.#processEvent(compatEvent, this.#handler.longTapEvent);
		this.#cancelClick = true;

		// long tap is active untill touchend event with 0 touches occured
		this.#longTapActive = true;
	}

	#processEvent(event: TouchMouseEvent, callback?: HandlerEventCallback): void {
		if (!callback) {
			return;
		}

		callback.call(this.#handler, event);
	}

	#makeCompatEvent(event: MouseEvent | TouchEvent): TouchMouseEvent {
		// TouchEvent has no clientX/Y coordinates:
		// We have to use the last Touch instead
		let eventLike: MouseEvent | Touch;
		if ('touches' in event && event.touches.length) {
			eventLike = event.touches[0];
		} else if ('changedTouches' in event && event.changedTouches.length) {
			eventLike = event.changedTouches[0];
		} else {
			eventLike = event as MouseEvent;
		}

		const box = getBoundingClientRect(this.#target);

		return {
			clientX: eventLike.clientX,
			clientY: eventLike.clientY,
			pageX: eventLike.pageX,
			pageY: eventLike.pageY,
			screenX: eventLike.screenX,
			screenY: eventLike.screenY,
			localX: eventLike.clientX - box.left,
			localY: eventLike.clientY - box.top,

			ctrlKey: event.ctrlKey,
			altKey: event.altKey,
			shiftKey: event.shiftKey,
			metaKey: event.metaKey,

			type: event.type.startsWith('mouse') ? 'mouse' : 'touch',

			target: eventLike.target,
			view: event.view,
		};
	}
}

function getBoundingClientRect(element: HTMLElement): ClientRect | DOMRect {
	return element.getBoundingClientRect() || { left: 0, top: 0 };
}

function getDistance(p1: Touch, p2: Touch): number {
	const xDiff = p1.clientX - p2.clientX;
	const yDiff = p1.clientY - p2.clientY;
	return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

function isTouchEvent(event: MouseEvent | TouchEvent): event is TouchEvent {
	return Boolean((event as TouchEvent).touches);
}

function preventDefault(event: Event): void {
	if (event.cancelable) {
		event.preventDefault();
	}
}
