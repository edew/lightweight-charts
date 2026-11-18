// Turns Pointer Events on one element into the gestures that the chart uses.
// Mouse, touch and pen go through the same code. Positions are in CSS pixels,
// relative to the element.

const LONG_TAP_DELAY = 240;
const DOUBLE_CLICK_DELAY = 500;
/** A pointer that moved less than this number of pixels did a click, not a drag. */
const CLICK_DISTANCE = 5;

export interface PointerHandlers {
	/** The mouse moved over the element with no button down. */
	hover(x: number, y: number): void;
	/** The mouse left the element. */
	leave(): void;
	down(x: number, y: number, isTouch: boolean): void;
	/** A move with the button or the finger down. */
	drag(x: number, y: number, isTouch: boolean): void;
	up(): void;
	click(x: number, y: number): void;
	doubleClick(x: number, y: number): void;
	/** A finger stayed down at one place. */
	longTap(x: number, y: number): void;
	pinchStart(): void;
	/**
	 * Two fingers moved.
	 * @param centerX - x of the point between the fingers
	 * @param scale - distance between the fingers, relative to the distance at the start
	 */
	pinch(centerX: number, scale: number): void;
}

interface ActivePointer {
	id: number;
	x: number;
	y: number;
}

/** Adds the listeners. Returns a function that removes them. */
export function bindPointerEvents(target: HTMLElement, handlers: PointerHandlers): () => void {
	const pointers: ActivePointer[] = [];
	let downX = 0;
	let downY = 0;
	let moved = false;
	let pinchStartDistance = 0;
	let longTapTimer: ReturnType<typeof setTimeout> | null = null;
	let lastClickTime = 0;
	let lastClickX = 0;
	let lastClickY = 0;
	// reused for each event
	let x = 0;
	let y = 0;

	function locate(event: PointerEvent): void {
		const box = target.getBoundingClientRect();
		x = event.clientX - box.left;
		y = event.clientY - box.top;
	}

	function find(id: number): number {
		for (let i = 0; i < pointers.length; i++) {
			if (pointers[i].id === id) {
				return i;
			}
		}
		return -1;
	}

	function clearLongTap(): void {
		if (longTapTimer !== null) {
			clearTimeout(longTapTimer);
			longTapTimer = null;
		}
	}

	function pinchDistance(): number {
		return Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
	}

	function onDown(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && event.button !== 0) {
			return;
		}

		locate(event);
		const isTouch = event.pointerType === 'touch';
		pointers.push({ id: event.pointerId, x, y });

		if (pointers.length === 1) {
			// the element gets the moves and the release also when the pointer is outside it
			target.setPointerCapture(event.pointerId);
			downX = x;
			downY = y;
			moved = false;
			if (isTouch) {
				const tapX = x;
				const tapY = y;
				longTapTimer = setTimeout(() => {
					longTapTimer = null;
					handlers.longTap(tapX, tapY);
				}, LONG_TAP_DELAY);
			}
			handlers.down(x, y, isTouch);
		} else if (pointers.length === 2) {
			clearLongTap();
			moved = true;
			pinchStartDistance = pinchDistance();
			handlers.pinchStart();
		}
	}

	function onMove(event: PointerEvent): void {
		locate(event);
		const position = find(event.pointerId);
		if (position === -1) {
			if (event.pointerType === 'mouse' && pointers.length === 0) {
				handlers.hover(x, y);
			}
			return;
		}

		pointers[position].x = x;
		pointers[position].y = y;

		if (pointers.length === 2) {
			if (pinchStartDistance > 0) {
				handlers.pinch((pointers[0].x + pointers[1].x) / 2, pinchDistance() / pinchStartDistance);
			}
			return;
		}

		if (pointers.length === 1) {
			if (!moved && Math.hypot(x - downX, y - downY) >= CLICK_DISTANCE) {
				moved = true;
				clearLongTap();
			}
			handlers.drag(x, y, event.pointerType === 'touch');
		}
	}

	function onUp(event: PointerEvent): void {
		const position = find(event.pointerId);
		if (position === -1) {
			return;
		}

		locate(event);
		pointers.splice(position, 1);
		clearLongTap();
		if (pointers.length !== 0) {
			// one finger of a pinch is still down: wait for it
			return;
		}

		handlers.up();

		if (event.type === 'pointerup' && !moved) {
			handlers.click(x, y);

			const now = performance.now();
			if (now - lastClickTime < DOUBLE_CLICK_DELAY && Math.hypot(x - lastClickX, y - lastClickY) < CLICK_DISTANCE) {
				handlers.doubleClick(x, y);
				lastClickTime = 0;
			} else {
				lastClickTime = now;
				lastClickX = x;
				lastClickY = y;
			}
		}
	}

	function onLeave(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && pointers.length === 0) {
			handlers.leave();
		}
	}

	target.addEventListener('pointerdown', onDown);
	target.addEventListener('pointermove', onMove);
	target.addEventListener('pointerup', onUp);
	target.addEventListener('pointercancel', onUp);
	target.addEventListener('pointerleave', onLeave);

	return () => {
		clearLongTap();
		target.removeEventListener('pointerdown', onDown);
		target.removeEventListener('pointermove', onMove);
		target.removeEventListener('pointerup', onUp);
		target.removeEventListener('pointercancel', onUp);
		target.removeEventListener('pointerleave', onLeave);
	};
}
