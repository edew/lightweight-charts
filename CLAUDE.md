# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Context

This is a pared-down fork of TradingView's `lightweight-charts` (v2.0.0), developed on the `20kb` branch with a focus on minimizing bundle size. Much of the upstream feature set (many series types, plugins, build tooling) has been stripped. Single runtime dependency: `fancy-canvas` (canvas abstraction); everything else is hand-rolled.

## Commands

| Task | Command |
|------|---------|
| Dev server (debug page) | `npm start` (Vite, serves `index.html`) |
| Build library | `npm run build` (Vite lib mode → `dist/`) |
| Type check | `npm run typecheck` (`tsc --noEmit`) |
| Run all tests | `npm test` (`vitest run tests/**/**.spec.ts`) |
| Run a single test file | `npx vitest run tests/unittests/<name>.spec.ts` |
| Filter by test name | `npx vitest run -t "<substring>"` |

Verify changes with `npm run typecheck && npm test` before considering work complete.

## Architecture

Five-layer architecture, top depends on bottom:

```
API (src/api/)            Public surface: IChartApi, ISeriesApi. ChartApi orchestrates.
 ↓                        DataLayer converts user time (UTC/BusinessDay) → internal TimePoint.
GUI (src/gui/)            ChartWidget runs the RAF render loop. PaneWidget manages dual
 ↓                        canvases (background + top layer). Mouse/touch handling.
Model (src/model/) ↔ Views (src/views/)
 ↓                        Model: ChartModel is the central hub; Series, Pane, PriceScale,
Renderers (src/renderers/)  TimeScale hold state and trigger invalidation. Model classes
                            create and own their Views. Views bridge model→renderer with
                            lazy recalc (_invalidated flag). Renderers do stateless canvas draw.
```

**Data flow**: `seriesApi.setData()` → `DataLayer` (time conversion) → `Series.setData()` → `ChartModel._invalidate(InvalidateMask)` → RAF scheduled → `Pane.updateAllViews()` (lazy view recalc) → `renderer.draw(ctx, pixelRatio, isHovered)`.

Renderers have no upward dependencies; data is pushed in via `setData()`. Views (`views/pane/`, `views/price-axis/`, `views/time-axis/`) read from Model and produce Renderers.

## Key Patterns

- **Nominal/branded types** (`src/helpers/nominal.ts`): zero-runtime type wrappers like `Coordinate`, `TimePointIndex`, `UTCTimestamp`. Always cast explicitly (`42 as Coordinate`); never mix them — this is the primary guard against coordinate/index confusion.
- **Options & DeepPartial** (`src/helpers/strict-type-checks.ts`): user-facing options are `DeepPartial<T>`. Defaults live in `src/api/options/*-defaults.ts`, applied via `merge(clone(defaults), userOptions)` — always clone defaults first. Mutate options only through `setOptions()` so invalidation fires.
- **Invalidation** (`src/model/invalidate-mask.ts`): levels `None < Cursor < Light < Full`. Cursor-only changes skip data recalculation. Views check `_invalidated` before recomputing.
- **Event system** (`src/helpers/delegate.ts`): `Delegate<T1,T2>` implements `ISubscription`. Subscribe with a `linkedObject` (`delegate.subscribe(cb, this)`) to enable batch cleanup via `delegate.unsubscribeAll(this)` — do this for subscriptions made in constructors to avoid leaks.
- **Assertions** (`src/helpers/assertions.ts`): use `ensureDefined()` / `ensureNotNull()` instead of non-null `!`; use `assert()` for invariants.
- **Cleanup**: classes needing teardown implement `IDestroyable.destroy()`. Charts must be removed via `chart.remove()` to avoid leaks.

## Conventions

- Public API interfaces use `I` prefix (`IChartApi`); internal classes drop it (`ChartApi`). Only `I`-prefixed interfaces are exported from `src/index.ts`.
- Private fields use `_` prefix (no `#private` syntax). `const enum` for internal flag sets.
- **Tab indentation** throughout.
- Target ES2022, strict mode, `moduleResolution: bundler`, `verbatimModuleSyntax`, no CommonJS. TS extensions allowed in imports.

## Performance Model

Performance is the reason this library exists; the design optimizes for the common case (real-time append + pan/zoom over large series). Preserve these invariants when editing — a change that "works" but breaks one of them is a regression:

- **Columnar, sorted, binary-searched data.** Every point (line/area/bar/candle) is normalized at ingest into a fixed 4-tuple `PlotRow` `[open, high, low, close]` (`src/model/plot-data.ts`) — one storage path for all series types. `PlotList` (`src/model/plot-list.ts`) keeps a read-only array sorted by `TimePointIndex`; all time→index lookups go through `lowerBound`/`upperBound` binary search (`src/helpers/algorithms.ts`) for O(log n). Never introduce a linear scan over all points or a per-point map on a hot path.
- **O(1) real-time ingest.** `DataLayer.updateSeriesData` (`src/model/data-layer.ts`) separates the streaming path from `setData`'s full O(n log n) rebuild: an in-place tick (same timestamp as last bar) overwrites the final array element; a new bar appends and binary-search-inserts into `_sortedTimePoints`, re-indexing only points after the insertion. Out-of-order *older* updates throw, so the array never re-sorts on the hot path. The `DataLayer` keeps two maps that **share** the same `PlotRow` objects (time→points and series→rows) — don't clone rows.
- **Skip the time-scale rebuild when possible.** An in-place update returns `firstChangedPointIndex = -1` / `affectsTimeScale = false`, which bypasses tick-mark relayout and the time-axis rebuild. Keep this short-circuit intact.
- **Tiered invalidation** (`src/model/invalidate-mask.ts`): `None < Cursor < Light < Full`. Cursor repaints only the cheap top canvas (crosshair); Light recomputes price scales + redraws series; Full rebuilds GUI structure (resize/pane add-remove, rare). Use the lowest level that reflects what actually changed.
- **RAF batching + merge** (`src/gui/chart-widget.ts`): all model changes in a frame merge (max level, OR'd autoscale flags) into a single `requestAnimationFrame` → at most one `_drawImpl` per frame. Invalidations buffer into a field and never draw synchronously; a `Full` escalation caused re-entrantly *during* a Light draw is folded forward into the current frame to avoid painting stale geometry (see `perf-summary-2.md` Deep dive A).
- **Lazy, flag-guarded recompute.** Autoscale price range recomputes once per invalidation (`_makeSureItIsValid` / `_invalidatedForRange`), not per coordinate lookup; visible range is derived by formula behind a `_visibleRangeInvalidated` flag. Autoscale min/max is chunked so a tick only re-scans the edges.
- **Cache expensive work behind invalidation.** Text width (`src/model/text-width-cache.ts`, normalizes digits so `"12:34"`/`"56:78"` share a measurement), color/RGBA parsing, and axis tick-mark layout are all memoized and invalidated only on the relevant change.
- **Draw only what's visible.** Every renderer binary-searches the visible window and bails if it's null; coordinate mapping and draw loops iterate only `[from, to)`. Streaming into a 100k-point series while showing 200 bars must transform ~200 points, not 100k.
- **Cheap inner loops.** Write `ctx.fillStyle`/`strokeStyle` only when the color changes and flush one `fill()`/`stroke()` per color run (`src/renderers/walk-line.ts`, `candlesticks-renderer.ts`). Series draw in physical bitmap pixels (HiDPI); text/axes use CSS-pixel media space (both via `fancy-canvas`).

**Known non-incremental hot spots** (candidates to profile, not yet optimized): every tick still calls `model.recalculateAllPanes()` (`src/api/chart-api.ts`) even for a pure in-place tick; and `_fillRawPoints` (`src/model/series/*-pane-view-base.ts`) reallocates the entire `_items` array per **data** tick (O(n) in series length), while pan/zoom/cursor frames only rewrite `x`/`y` in place and allocate nothing. See `perf-summary.md` and `perf-summary-2.md` for full detail.

## Testing

- **Vitest** with **Chai** assertions (`expect(...).to.be.equal(...)`).
- Tests in `tests/unittests/*.spec.ts`, named to mirror source files.
- Use branded casts in fixtures: `1000 as UTCTimestamp`, `0 as TimePointIndex`.
