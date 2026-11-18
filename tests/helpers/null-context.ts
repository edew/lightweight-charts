// A canvas context that does nothing. The benchmark uses it to measure the cost of
// the draw code with no rasterizer.

const noop = (): void => {};

export function createNullContext(): CanvasRenderingContext2D {
	const ctx = {
		canvas: { width: 0, height: 0 },
		fillStyle: '',
		strokeStyle: '',
		lineWidth: 1,
		lineCap: 'butt',
		lineJoin: 'miter',
		lineDashOffset: 0,
		font: '',
		textAlign: 'start',
		textBaseline: 'alphabetic',
		globalAlpha: 1,
		globalCompositeOperation: 'source-over',
		save: noop,
		restore: noop,
		scale: noop,
		translate: noop,
		rotate: noop,
		setTransform: noop,
		resetTransform: noop,
		beginPath: noop,
		closePath: noop,
		moveTo: noop,
		lineTo: noop,
		rect: noop,
		arc: noop,
		clip: noop,
		fill: noop,
		stroke: noop,
		fillRect: noop,
		strokeRect: noop,
		clearRect: noop,
		fillText: noop,
		setLineDash: noop,
		drawImage: noop,
		measureText: (text: string) => ({ width: text.length * 6 }),
	};
	return ctx as unknown as CanvasRenderingContext2D;
}
