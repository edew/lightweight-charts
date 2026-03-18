import { ensureNotNull } from '../helpers/assertions';
import { notNull } from '../helpers/strict-type-checks';

import { LineStyle, type LineWidth } from '../renderers/draw-line';
import { CrosshairMarksPaneView } from '../views/pane/crosshair-marks-pane-view';
import { CrosshairPaneView } from '../views/pane/crosshair-pane-view';
import type { IPaneView } from '../views/pane/ipane-view';
import { CrosshairPriceAxisView } from '../views/price-axis/crosshair-price-axis-view';
import type { IPriceAxisView } from '../views/price-axis/iprice-axis-view';
import { PriceAxisView } from '../views/price-axis/price-axis-view';
import { CrosshairTimeAxisView } from '../views/time-axis/crosshair-time-axis-view';
import { TimeAxisView } from '../views/time-axis/time-axis-view';

import type { BarPrice } from './bar';
import { ChartModel } from './chart-model';
import type { Coordinate } from './coordinate';
import { DataSource } from './data-source/data-source';
import { Pane } from './pane';
import { PriceScale } from './price-scale/price-scale';
import { Series } from './series';
import type { TimePoint, TimePointIndex } from './time-scale/time-data';

export interface CrosshairPriceAndCoordinate {
	price: number;
	coordinate: number;
}

export interface CrosshairTimeAndCoordinate {
	time: TimePoint | null;
	coordinate: number;
}

export type PriceAndCoordinateProvider = (priceScale: PriceScale) => CrosshairPriceAndCoordinate;
export type TimeAndCoordinateProvider = () => CrosshairTimeAndCoordinate;

/**
 * Enum of possible crosshair behavior modes.
 * Normal means that the crosshair always follows the pointer.
 * Magnet means that the vertical line of the crosshair follows the pointer, while the horizontal line is placed on the corresponding series point.
 */
export const enum CrosshairMode {
	Normal,
	Magnet,
}

/** Structure describing a crosshair line (vertical or horizontal) */
export interface CrosshairLineOptions {
	/** Color of a certain crosshair line */
	color: string;
	/** Width of a certain crosshair line and corresponding scale label */
	width: LineWidth;
	/** Style of a certain crosshair line */
	style: LineStyle;
	/** Visibility of a certain crosshair line */
	visible: boolean;
	/** Visibility of corresponding scale label */
	labelVisible: boolean;
	/** Background color of corresponding scale label */
	labelBackgroundColor: string;
}

/** Structure describing crosshair options  */
export interface CrosshairOptions {
	/** Crosshair mode */
	mode: CrosshairMode;
	/** Options of the crosshair vertical line */
	vertLine: CrosshairLineOptions;
	/** Options of the crosshair horizontal line */
	horzLine: CrosshairLineOptions;
}

type RawPriceProvider = () => BarPrice;
type RawCoordinateProvider = () => Coordinate;
type RawIndexProvider = () => TimePointIndex;

export class Crosshair extends DataSource {
	#pane: Pane | null = null;
	#price: number = NaN;
	#index: TimePointIndex = 0 as TimePointIndex;
	#visible: boolean = true;
	readonly #model: ChartModel;
	#priceAxisViews: Map<PriceScale, CrosshairPriceAxisView> = new Map();
	readonly #timeAxisView: CrosshairTimeAxisView;
	readonly #markersPaneView: CrosshairMarksPaneView;
	#subscribed: boolean = false;
	readonly #currentPosPriceProvider: PriceAndCoordinateProvider;
	readonly #options: CrosshairOptions;
	readonly #paneView: CrosshairPaneView;

	#x: Coordinate = NaN as Coordinate;
	#y: Coordinate = NaN as Coordinate;

	#originX: Coordinate = NaN as Coordinate;
	#originY: Coordinate = NaN as Coordinate;

	public constructor(model: ChartModel, options: CrosshairOptions) {
		super();
		this.#model = model;
		this.#options = options;
		this.#markersPaneView = new CrosshairMarksPaneView(model, this);

		const valuePriceProvider = (rawPriceProvider: RawPriceProvider, rawCoordinateProvider: RawCoordinateProvider) => {
			return (priceScale: PriceScale) => {
				const coordinate = rawCoordinateProvider();
				const rawPrice = rawPriceProvider();
				if (priceScale === ensureNotNull(this.#pane).defaultPriceScale()) {
					// price must be defined
					return { price: rawPrice, coordinate: coordinate };
				} else {
					// always convert from coordinate
					const firstValue = ensureNotNull(priceScale.firstValue());
					const price = priceScale.coordinateToPrice(coordinate, firstValue);
					return { price: price, coordinate: coordinate };
				}
			};
		};

		const valueTimeProvider = (rawIndexProvider: RawIndexProvider, rawCoordinateProvider: RawCoordinateProvider) => {
			return () => {
				return {
					time: this.#model.timeScale().indexToUserTime(rawIndexProvider()),
					coordinate: rawCoordinateProvider(),
				};
			};
		};

		// for current position always return both price and coordinate
		this.#currentPosPriceProvider = valuePriceProvider(
			() => this.#price as BarPrice,
			() => this.#y
		);

		const currentPosTimeProvider = valueTimeProvider(
			() => this.#index,
			() => this.appliedX()
		);

		this.#timeAxisView = new CrosshairTimeAxisView(this, model, currentPosTimeProvider);
		this.#paneView = new CrosshairPaneView(this);
	}

	public index(): TimePointIndex {
		return this.#index;
	}

	public options(): Readonly<CrosshairOptions> {
		return this.#options;
	}

	public saveOriginCoord(x: Coordinate, y: Coordinate): void {
		this.#originX = x;
		this.#originY = y;
	}

	public clearOriginCoord(): void {
		this.#originX = NaN as Coordinate;
		this.#originY = NaN as Coordinate;
	}

	public originCoordX(): Coordinate {
		return this.#originX;
	}

	public originCoordY(): Coordinate {
		return this.#originY;
	}

	public setPosition(index: TimePointIndex, price: number, pane: Pane): void {
		if (!this.#subscribed) {
			this.#subscribed = true;
		}

		this.#visible = true;

		this.#tryToUpdateViews(index, price, pane);
	}

	public appliedIndex(): TimePointIndex {
		return this.#index;
	}

	public appliedX(): Coordinate {
		return this.#x;
	}

	public appliedY(): Coordinate {
		return this.#y;
	}

	public visible(): boolean {
		return this.#visible;
	}

	public clearPosition(): void {
		this.#visible = false;
		this.#setIndexToLastSeriesBarIndex();

		this.#price = NaN;
		this.#x = NaN as Coordinate;
		this.#y = NaN as Coordinate;
		this.#pane = null;

		this.clearOriginCoord();
	}

	public paneViews(pane: Pane): ReadonlyArray<IPaneView> {
		return this.#pane !== null ? [this.#paneView, this.#markersPaneView] : [];
	}

	public horzLineVisible(pane: Pane): boolean {
		return pane === this.#pane && this.#options.horzLine.visible;
	}

	public vertLineVisible(): boolean {
		return this.#options.vertLine.visible;
	}

	public priceAxisViews(pane: Pane, priceScale: PriceScale): IPriceAxisView[] {
		if (!this.#visible || this.#pane !== pane) {
			this.#priceAxisViews.clear();
		}

		const views: IPriceAxisView[] = [];
		if (this.#pane === pane) {
			views.push(this.#createPriceAxisViewOnDemand(this.#priceAxisViews, priceScale, this.#currentPosPriceProvider));
		}

		return views;
	}

	public timeAxisViews(): ReadonlyArray<TimeAxisView> {
		return this.#visible ? [this.#timeAxisView] : [];
	}

	public pane(): Pane | null {
		return this.#pane;
	}

	public updateAllViews(): void {
		this.#priceAxisViews.forEach((value: PriceAxisView) => value.update());
		this.#timeAxisView.update();
		this.#markersPaneView.update();
	}

	#priceScaleByPane(pane: Pane): PriceScale | null {
		if (pane && !pane.defaultPriceScale().isEmpty()) {
			return pane.defaultPriceScale();
		}

		return null;
	}

	#tryToUpdateViews(index: TimePointIndex, price: number, pane: Pane): void {
		if (this.#tryToUpdateData(index, price, pane)) {
			this.updateAllViews();
		}
	}

	#tryToUpdateData(newIndex: TimePointIndex, newPrice: number, newPane: Pane): boolean {
		const oldX = this.#x;
		const oldY = this.#y;
		const oldPrice = this.#price;
		const oldIndex = this.#index;
		const oldPane = this.#pane;
		const priceScale = this.#priceScaleByPane(newPane);

		this.#index = newIndex;
		this.#x = isNaN(newIndex) ? NaN as Coordinate : this.#model.timeScale().indexToCoordinate(newIndex);
		this.#pane = newPane;

		const firstValue = priceScale !== null ? priceScale.firstValue() : null;
		if (priceScale !== null && firstValue !== null) {
			this.#price = newPrice;
			this.#y = priceScale.priceToCoordinate(newPrice, firstValue);
		} else {
			this.#price = NaN;
			this.#y = NaN as Coordinate;
		}

		return (oldX !== this.#x || oldY !== this.#y || oldIndex !== this.#index ||
			oldPrice !== this.#price || oldPane !== this.#pane);
	}

	#setIndexToLastSeriesBarIndex(): void {
		const lastIndexes = this.#model.serieses()
			.map((s: Series) => s.bars().lastIndex())
			.filter(notNull);
		const lastBarIndex = (lastIndexes.length === 0) ? null : (Math.max(...lastIndexes) as TimePointIndex);
		this.#index = lastBarIndex !== null ? lastBarIndex : NaN as TimePointIndex;
	}

	#createPriceAxisViewOnDemand(map: Map<PriceScale, CrosshairPriceAxisView>, priceScale: PriceScale, valueProvider: PriceAndCoordinateProvider): IPriceAxisView {
		let view = map.get(priceScale);

		if (view === undefined) {
			view = new CrosshairPriceAxisView(this, priceScale, valueProvider);
			map.set(priceScale, view);
		}

		return view;
	}
}
