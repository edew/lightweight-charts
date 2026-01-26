# Lightweight Charts - AI Coding Agent Instructions

## Project Overview
**lightweight-charts** is a high-performance financial charting library built with HTML5 canvas and TypeScript. It prioritizes minimal bundle size and fast rendering for displaying OHLC candlestick and line series data.

**Key architectural principle**: Separation of concerns across three layers:
- **API Layer** (`src/api/`): Public interfaces and data consumers that expose chart functionality
- **Model Layer** (`src/model/`): Core business logic, data structures, and state management
- **GUI Layer** (`src/gui/`, `src/views/`, `src/renderers/`): Canvas rendering and user interaction

## Architecture Patterns

### Event System: Delegate Pattern
The codebase uses a custom `Delegate<T1, T2>` event emitter instead of native events:
- Located in [src/helpers/delegate.ts](src/helpers/delegate.ts)
- Implements `ISubscription<T1, T2>` interface for publish-subscribe
- Methods: `subscribe(callback, linkedObject?, singleshot?)`, `fire(param1, param2)`, `unsubscribeAll(linkedObject)`
- Used throughout for model→GUI communication: `clicked()`, `crosshairMoved()`

**Example**: In [src/api/chart-api.ts#L102-L109](src/api/chart-api.ts#L102-L109), chart widget click events fire through delegates.

### Resource Management: IDestroyable Pattern
Components managing canvas, subscriptions, or timers implement `IDestroyable` interface:
- Requires `destroy()` method to clean up resources
- Used by: `ChartApi`, `ChartWidget`, `SeriesApi`, `TimeScaleApi`, `PriceScaleApi`
- **Critical**: Always call `destroy()` on chart instances and series to prevent memory leaks

### Type System: Branded Types and Mapped Types
- **Branded types** (nominal typing): `TimePointIndex`, `UTCTimestamp` in [src/model/time-data.ts](src/model/time-data.ts) prevent accidental type confusion
- **SeriesType union**: [src/model/series-options.ts#L188](src/model/series-options.ts#L188) defines `SeriesType = 'Line' | 'Candlestick'`
- **Mapped types**: `SeriesOptionsMap`, `SeriesDataItemTypeMap`, `SeriesUpdatePacket` enable type-safe series polymorphism

### Data Flow: API → DataLayer → Model → GUI
1. User calls `ChartApi.addLineSeries()` or `series.setData()`
2. `DataLayer` in [src/api/data-layer.ts](src/api/data-layer.ts) transforms raw BarData/LineData into time-indexed plot rows
3. `Series` model updates internal `SeriesData` and `PlotList` structures
4. `ChartModel` triggers invalidation mask updates
5. `ChartWidget` renders via pane/price-axis/time-axis views during RAF callback

## Critical Developer Workflows

### Build and Development
```bash
npm install                    # Install dependencies
npm start                      # Vite dev server at http://localhost:5173
npm run build                  # Production build to dist/
npm test                       # Run vitest tests (tests/**/*.spec.ts)
```

### Configuration
- **TypeScript**: [tsconfig.json](tsconfig.json) targets ES2022, strict mode enabled
- **Build tool**: Vite with dual output: ESM (`lightweight-charts.esm.production.js`) and UMD/standalone
- **Dependencies**: Only `fancy-canvas` (0.2.1) for optimized canvas utilities

### Testing
- Framework: Vitest + Chai assertions
- Pattern: Unit tests in `tests/unittests/*.spec.ts` (e.g., [tests/unittests/color.spec.ts](tests/unittests/color.spec.ts))
- Run: `npm test` or `npm test -- --watch`

## Project-Specific Conventions

### 1. Options Pattern with DeepPartial Merging
All configurable objects use `DeepPartial<T>` for user input, merged with defaults via [src/helpers/strict-type-checks.ts#L10](src/helpers/strict-type-checks.ts#L10) `merge()` function:
```typescript
// In ChartApi constructor
const internalOptions = merge(clone(chartOptionsDefaults), toInternalOptions(options))
```
This ensures type safety while allowing partial overrides at any nesting level.

### 2. Formatters as Strategies
Formatting logic (price, date, time, volume) lives in [src/formatters/](src/formatters/) as pluggable strategies:
- Implement `IFormatter` interface
- Series stores formatter instance and calls it at render time
- Used for axis labels and tooltips

### 3. Price Scale Conversions
`PriceScale` in [src/model/price-scale.ts](src/model/price-scale.ts) manages coordinate system:
- Converts price values ↔ canvas Y coordinates
- Handles logarithmic and percentage scales
- Each pane can have its own price scale

### 4. Time Data: BusinessDay vs UTCTimestamp
[src/api/data-consumer.ts](src/api/data-consumer.ts) and [src/model/time-data.ts](src/model/time-data.ts) normalize time inputs:
- `BusinessDay`: `{ year, month, day }` for trading days (skips weekends)
- `UTCTimestamp`: Unix seconds for continuous time
- `DataLayer` converts both to `TimePoint` with index for internal use

### 5. Series Architecture: Model + API Wrapper
Each series type follows a pattern:
- **Model**: `Series` in [src/model/series.ts](src/model/series.ts) holds data and options, creates pane views
- **API**: `SeriesApi<T>` in [src/api/series-api.ts](src/api/series-api.ts) is the public interface; `CandlestickSeriesApi` extends it
- **Views**: Series generates pane views (`SeriesLinePaneView`, `SeriesCandlesticksPaneView`) and price-axis view

## Integration Points

### External Dependency: fancy-canvas
- Canvas utilities in [src/gui/canvas-utils.ts](src/gui/canvas-utils.ts) wrap `fancy-canvas` for device pixel ratio handling
- Do not manipulate canvas directly; use provided wrappers

### Rendering Pipeline
1. `ChartWidget` receives RAF callback from browser
2. Checks `InvalidateMask` to determine what needs redraw (granular invalidation)
3. Calls `render()` on each `PaneWidget` and axis widget
4. Widgets delegate to contained `IPaneView` and `IPriceAxisView` instances
5. Views call renderer functions in [src/renderers/](src/renderers/)

### User Interaction
- `MouseEventHandler` in [src/gui/mouse-event-handler.ts](src/gui/mouse-event-handler.ts) processes DOM events
- Converts to model coordinates via price/time scales
- Fires `clicked()` and `crosshairMoved()` delegates on `ChartWidget`

## Common Pitfalls to Avoid

1. **Forgetting to destroy charts**: Call `chart.remove()` (which calls `destroy()`) to prevent memory leaks
2. **Mutating options directly**: Always use `setOptions()` methods; they trigger proper invalidation
3. **Assuming immutable price ranges**: Call `autoScale()` or reset scales after major data updates
4. **Canvas coordinate confusion**: Prices and time are always model coordinates; convert via `priceScale.coordinateToPrice()` and `timeScale.indexToCoordinate()`
5. **Delegate memory leaks**: Use `linkedObject` parameter when subscribing inside class constructors to enable batch cleanup via `unsubscribeAll()`

## File Organization Quick Reference
- **Public API entry**: [src/index.ts](src/index.ts), [src/api/create-chart.ts](src/api/create-chart.ts)
- **Configuration defaults**: [src/api/options/](src/api/options/)
- **Data transformation**: [src/api/data-layer.ts](src/api/data-layer.ts)
- **Core models**: [src/model/chart-model.ts](src/model/chart-model.ts), [src/model/series.ts](src/model/series.ts), [src/model/time-scale.ts](src/model/time-scale.ts)
- **Helpers (utilities, type guards)**: [src/helpers/](src/helpers/)
- **Rendering logic**: [src/renderers/](src/renderers/) (grid, crosshair, candlesticks, lines)
