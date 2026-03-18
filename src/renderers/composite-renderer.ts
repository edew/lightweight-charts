import type { IPaneRenderer } from './ipane-renderer';

export class CompositeRenderer implements IPaneRenderer {
	#renderers: ReadonlyArray<IPaneRenderer> = [];

	public setRenderers(renderers: ReadonlyArray<IPaneRenderer>): void {
		this.#renderers = renderers;
	}

	public draw(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void {
		this.#renderers.forEach((r: IPaneRenderer) => {
			ctx.save();
			r.draw(ctx, pixelRatio, isHovered, hitTestData);
			ctx.restore();
		});
	}
}
