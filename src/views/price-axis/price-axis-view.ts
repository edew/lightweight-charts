import { generateTextColor } from '../../helpers/color';

import type {
	IPriceAxisViewRenderer,
	IPriceAxisViewRendererConstructor,
	PriceAxisViewRendererCommonData,
	PriceAxisViewRendererData,
	PriceAxisViewRendererOptions,
} from '../../renderers/iprice-axis-view-renderer';
import { PriceAxisViewRenderer } from '../../renderers/price-axis-view-renderer';

import type { IPriceAxisView } from './iprice-axis-view';

export abstract class PriceAxisView implements IPriceAxisView {
	readonly #commonRendererData: PriceAxisViewRendererCommonData = {
		coordinate: 0,
		color: '#FFF',
		background: '#000',
	};

	readonly #axisRendererData: PriceAxisViewRendererData = {
		text: '',
		visible: false,
		tickVisible: true,
		borderColor: '',
	};

	readonly #paneRendererData: PriceAxisViewRendererData = {
		text: '',
		visible: false,
		tickVisible: false,
		borderColor: '',
	};

	readonly #axisRenderer: IPriceAxisViewRenderer;
	readonly #paneRenderer: IPriceAxisViewRenderer;
	#invalidated: boolean = true;

	public constructor(ctor?: IPriceAxisViewRendererConstructor) {
		this.#axisRenderer = new (ctor || PriceAxisViewRenderer)(this.#axisRendererData, this.#commonRendererData);
		this.#paneRenderer = new (ctor || PriceAxisViewRenderer)(this.#paneRendererData, this.#commonRendererData);
	}

	public text(): string {
		return this.#axisRendererData.text;
	}

	public background(): string {
		return this.#commonRendererData.background;
	}

	public color(): string {
		return generateTextColor(this.background());
	}

	public coordinate(): number {
		this.#updateRendererDataIfNeeded();
		return this.#commonRendererData.coordinate;
	}

	public update(): void {
		this.#invalidated = true;
	}

	public height(rendererOptions: PriceAxisViewRendererOptions, useSecondLine: boolean = false): number {
		return Math.max(
			this.#axisRenderer.height(rendererOptions, useSecondLine),
			this.#paneRenderer.height(rendererOptions, useSecondLine)
		);
	}

	public getFixedCoordinate(): number {
		return this.#commonRendererData.fixedCoordinate || 0;
	}

	public setFixedCoordinate(value: number): void {
		this.#commonRendererData.fixedCoordinate = value;
	}

	public isVisible(): boolean {
		this.#updateRendererDataIfNeeded();
		return this.#axisRendererData.visible || this.#paneRendererData.visible;
	}

	public isAxisLabelVisible(): boolean {
		this.#updateRendererDataIfNeeded();
		return this.#axisRendererData.visible;
	}

	public isPaneLabelVisible(): boolean {
		this.#updateRendererDataIfNeeded();
		return this.#paneRendererData.visible;
	}

	public renderer(): IPriceAxisViewRenderer {
		this.#updateRendererDataIfNeeded();
		this.#axisRenderer.setData(this.#axisRendererData, this.#commonRendererData);
		this.#paneRenderer.setData(this.#paneRendererData, this.#commonRendererData);

		return this.#axisRenderer;
	}

	public paneRenderer(): IPriceAxisViewRenderer {
		this.#updateRendererDataIfNeeded();
		this.#axisRenderer.setData(this.#axisRendererData, this.#commonRendererData);
		this.#paneRenderer.setData(this.#paneRendererData, this.#commonRendererData);

		return this.#paneRenderer;
	}

	protected abstract _updateRendererData(
		axisRendererData: PriceAxisViewRendererData,
		paneRendererData: PriceAxisViewRendererData,
		commonData: PriceAxisViewRendererCommonData
	): void;

	#updateRendererDataIfNeeded(): void {
		if (this.#invalidated) {
			this._updateRendererData(this.#axisRendererData, this.#paneRendererData, this.#commonRendererData);
			this.#invalidated = false;
		}
	}
}
