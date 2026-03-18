import { ensureNotNull } from '../../helpers/assertions';
import { generateTextColor } from '../../helpers/color';

import { ChartModel } from '../../model/chart-model';
import { Crosshair, type TimeAndCoordinateProvider } from '../../model/crosshair';
import { TimeAxisViewRenderer, type TimeAxisViewRendererData } from '../../renderers/time-axis-view-renderer';

import { TimeAxisView } from './time-axis-view';

export class CrosshairTimeAxisView extends TimeAxisView {
	#invalidated: boolean = true;
	readonly #crosshair: Crosshair;
	readonly #model: ChartModel;
	readonly #valueProvider: TimeAndCoordinateProvider;
	readonly #renderer: TimeAxisViewRenderer = new TimeAxisViewRenderer();
	readonly #rendererData: TimeAxisViewRendererData = {
		visible: false,
		background: '#4c525e',
		color: 'white',
		text: '',
		width: 0,
		coordinate: NaN,
	};

	public constructor(crosshair: Crosshair, model: ChartModel, valueProvider: TimeAndCoordinateProvider) {
		super();

		this.#crosshair = crosshair;
		this.#model = model;
		this.#valueProvider = valueProvider;
	}

	public update(): void {
		this.#invalidated = true;
	}

	public renderer(): TimeAxisViewRenderer {
		if (this.#invalidated) {
			this.#updateImpl();
			this.#invalidated = false;
		}

		this.#renderer.setData(this.#rendererData);

		return this.#renderer;
	}

	#updateImpl(): void {
		const data = this.#rendererData;
		data.visible = false;

		const options = this.#crosshair.options().vertLine;

		if (!options.labelVisible) {
			return;
		}

		const timeScale = this.#model.timeScale();
		if (timeScale.isEmpty()) {
			return;
		}

		const currentTime = timeScale.indexToUserTime(this.#crosshair.appliedIndex());
		data.width = timeScale.width();

		const value = this.#valueProvider();
		if (!value.time) {
			return;
		}

		data.coordinate = value.coordinate;
		data.text = timeScale.formatDateTime(ensureNotNull(currentTime));
		data.visible = true;
		data.background = options.labelBackgroundColor;
		data.color = generateTextColor(options.labelBackgroundColor);
	}
}
