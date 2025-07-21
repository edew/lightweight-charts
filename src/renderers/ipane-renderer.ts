import type { HoveredObject } from '../model/chart-model';
import type { Coordinate } from '../model/coordinate';

export interface IPaneRenderer {
	draw(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void;
	drawBackground?(ctx: CanvasRenderingContext2D, pixelRatio: number, isHovered: boolean, hitTestData?: unknown): void;
	hitTest?(x: Coordinate, y: Coordinate): HoveredObject | null;
}
