# Lightweight Charts — Copilot Instructions

## Architecture

Five-layer architecture:

```
API (src/api/)
 ↓
GUI (src/gui/)
 ↓
Model (src/model/) ↔ Views (src/views/)
 ↓                    ↓
Renderers (src/renderers/)
```

- **API**: Public surface (`IChartApi`, `ISeriesApi`). `ChartApi` orchestrates; `DataLayer` converts user time formats (UTC/BusinessDay) to internal `TimePoint`. Only `I`-prefixed interfaces are exported. Depends on GUI and Model.
- **GUI**: `ChartWidget` runs the RAF render loop. `PaneWidget` manages dual canvases (background + top layer). Depends on Model, Views, and Renderers.
- **Model**: Core logic. `ChartModel` is the central hub. `Series`, `Pane`, `PriceScale`, `TimeScale` hold state and trigger invalidation. Model classes create and own their View instances.
- **Views** (`views/pane/`, `views/price-axis/`, `views/time-axis/`): Bridge model→renderer. Read data from Model, produce Renderers. Implement lazy recalculation via `_invalidated` flag.
- **Renderers**: Stateless canvas drawing. All implement `IPaneRenderer.draw(ctx, pixelRatio, isHovered)`. Data set via `setData()`. No upward dependencies.

**Data flow**: `seriesApi.setData()` → `DataLayer` (time conversion) → `Series.setData()` → `ChartModel._invalidate(InvalidateMask)` → RAF scheduled → `Pane.updateAllViews()` (lazy view recalc) → `renderer.draw()`.

## Key Patterns

### Nominal/Branded Types
Type-safe wrappers with zero runtime cost (`src/helpers/nominal.ts`):
```typescript
type Coordinate = Nominal<number, 'Coordinate'>;
type TimePointIndex = Nominal<number, 'TimePointIndex'>;
type UTCTimestamp = Nominal<number, 'UTCTimestamp'>;
```
Always cast explicitly: `42 as Coordinate`. Never mix nominal types — this is the primary guard against coordinate/index confusion.

### Options & DeepPartial
All user-facing options use `DeepPartial<T>` (`src/helpers/strict-type-checks.ts`). Defaults live in `src/api/options/*-defaults.ts`. Options are applied via `merge(clone(defaults), userOptions)` — always clone defaults first.

### Event System
`Delegate<T1, T2>` (`src/helpers/delegate.ts`) implements `ISubscription`. Supports linked-object bulk cleanup: `delegate.subscribe(cb, this)` then `delegate.unsubscribeAll(this)`.

### Invalidation System
`InvalidateMask` (`src/model/invalidate-mask.ts`) with levels: `None < Cursor < Light < Full`. Cursor-only changes skip data recalculation. Views check their `_invalidated` flag before recomputing.

### Assertions
Use `ensureDefined()` and `ensureNotNull()` from `src/helpers/assertions.ts` instead of non-null assertions (`!`). Use `assert()` for invariant checks.

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm start` (Vite) |
| Build library | `npm run build` |
| Type check | `npm run typecheck` |
| Run tests | `npm test` |
| Check both | `npm run typecheck && npm test` |

## Testing

- Framework: **Vitest** with **Chai** assertions (`expect(...).to.be.equal(...)`)
- Tests in `tests/unittests/*.spec.ts`, named to mirror source files
- Use `as Nominal` casts for branded types in tests: `1000 as UTCTimestamp`, `0 as TimePointIndex`

## Conventions

- **Verify all changes** by running `npm run typecheck && npm test` before considering work complete.
- Single external dependency: `fancy-canvas` (canvas abstraction). Everything else is hand-rolled.
- Public API interfaces use `I` prefix (`IChartApi`, `ISeriesApi`); internal classes drop it (`ChartApi`, `SeriesApi`).
- Private fields use `_` prefix. No `#private` syntax.
- `const enum` for internal flag sets (e.g., `InvalidationLevel`, `SeriesPlotIndex`).
- `IDestroyable` interface for classes needing cleanup. Implement `destroy()` method.
- Tab indentation throughout the codebase.
- Target: ES2022, strict mode, bundler module resolution. No CommonJS.

## Common Pitfalls to Avoid

1. **Forgetting to destroy charts**: Call `chart.remove()` (which calls `destroy()`) to prevent memory leaks
2. **Mutating options directly**: Always use `setOptions()` methods; they trigger proper invalidation
3. **Assuming immutable price ranges**: Call `autoScale()` or reset scales after major data updates
4. **Canvas coordinate confusion**: Prices and time are always model coordinates; convert via `priceScale.coordinateToPrice()` and `timeScale.indexToCoordinate()`
5. **Delegate memory leaks**: Use `linkedObject` parameter when subscribing inside class constructors to enable batch cleanup via `unsubscribeAll()`
