# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository context

This is a pared-down fork of TradingView's `lightweight-charts` (v2.0.0), developed on the `20kb` branch. The goals are minimum bundle size and maximum performance in a browser.

**The code is at the start of a rewrite.** `CLEANUP.md` is the work order and the source of truth for the design. Read it before you change `src/model`, `src/views`, `src/renderers`, `src/gui` or `src/api`. If this file and `CLEANUP.md` disagree, `CLEANUP.md` is correct.

## Commands

| Task | Command |
|------|---------|
| Dev server (debug page) | `npm start` (Vite, serves `index.html`) |
| Build library | `npm run build` (Vite lib mode → `dist/`) |
| Type check | `npm run typecheck` (`tsc --noEmit`) |
| Run all tests | `npm test` (`vitest run tests/**/**.spec.ts`) |
| Run a single test file | `npx vitest run tests/unittests/<name>.spec.ts` |
| Filter by test name | `npx vitest run -t "<substring>"` |
| Lint | `npm run lint` |
| Unused code | `npm run knip` |

`npm run bench` and `npm run test:visual` do not exist until Phase 0 of `CLEANUP.md` is done.

Verify changes with `npm run typecheck && npm test` before considering work complete. Use `npm ci` for a clean install; `package-lock.json` is committed.

## Target design (not built yet; see `CLEANUP.md`)

- **Columnar store.** One sorted `Float64Array` of UTC seconds for the chart. One `Float64Array` for each series, with 1 or 4 values for each bar. The time index is the array position. `BusinessDay` and string times are converted at the API edge.
- **Frame record.** One plain record for each frame: visible index range, x scale, pixel ratio, and for each pane its rectangle and price scale factors.
- **Draw functions.** Plain functions read the store and the frame record and draw to a context. No view classes, no renderer classes, no item arrays.
- **`SeriesKind`.** A series type is a record (`stride`, `draw`, `range`, `lastColor`). Public API: `chart.addSeries(Line({ ...options }))`.
- **Panes.** Supported. A pane is a rectangle in the two canvases, with its own price scales and series. The time scale is shared.
- **Two canvases.** One static, one overlay, for any number of panes. Layout is a pure function. `ResizeObserver` and Pointer Events replace `fancy-canvas` and the mouse/touch handler.
- **Tests with no browser.** Pixel tests with a native canvas in Node, draw-call log snapshots, and unit tests on plain data.

## Current code (to be replaced)

Five layers, top depends on bottom:

```
API (src/api/)            Public surface: IChartApi, ISeriesApi. DataLayer converts user time.
GUI (src/gui/)            ChartWidget runs the RAF loop. Pane, price-axis and time-axis widgets,
                          each with two canvases.
Model (src/model/) ↔ Views (src/views/)
Renderers (src/renderers/)
```

Data flow: `seriesApi.setData()` → `DataLayer` → `Series.updateData()` → `ChartModel` invalidation → RAF → views recalculate → `renderer.draw(ctx, pixelRatio)`.

Known facts about the current code. Older documents said the opposite for the first three:

- Append of a new bar is O(n): `PlotList.#append` uses `concat`.
- An in-place tick is not short-circuited. It rebuilds tick marks and calls `recalculateAllPanes()`.
- `_fillRawPoints` allocates one object for each bar on each data tick.
- `TimePoints.indexOf` is a linear scan.
- The model has pane arrays, but no public API makes a second pane.

## Performance rules (for all new code)

- **No object for each point.** Point data is in typed arrays. No per-point `Map` entry.
- **No allocation in a draw path or a tick path.** Reuse scratch buffers. No closures, `bind`, spread, `map` or `filter` there.
- **Ingest:** an in-place tick writes values in place and changes nothing in the time scale. An append is amortized O(1). An older timestamp throws.
- **Lookup:** time to index is a binary search. No linear scan over all points.
- **Tiered invalidation** (`src/model/invalidate-mask.ts`): `None < Cursor < Light < Full`. Cursor draws only the overlay. Use the lowest level that is correct.
- **RAF batching:** all changes in a frame merge into one draw. An invalidation does not draw synchronously. A `Full` escalation during a Light draw applies in the same frame (`CLEANUP.md`, Phase 7, "RAF mask ownership").
- **Draw only what is visible.** Loops run over `[from, to)`. When a bar is narrower than one device pixel, draw one aggregate for each pixel column.
- **Cheap inner loops.** Write `fillStyle` / `strokeStyle` only when the value changes. One `fill()` or `stroke()` for each color run. No `save` / `restore` in a bar loop.
- **Pixels.** Series draw in physical bitmap pixels with rounding. Read `devicePixelRatio` one time on resize, not in a draw path.
- **Cache behind invalidation:** text width, parsed colors, formatted labels, font strings.

## Conventions

- Public API interfaces use the `I` prefix (`IChartApi`). Only those are exported from `src/index.ts`.
- Private members use `#private` syntax. Protected members use the `_` prefix.
- `const enum` for internal flag sets.
- **Tab indentation.**
- Target ES2022, strict mode, `moduleResolution: bundler`, `verbatimModuleSyntax`, no CommonJS.
- **Nominal types** (`src/helpers/nominal.ts`): `Coordinate`, `TimePointIndex`, `UTCTimestamp`. Cast explicitly (`42 as Coordinate`).
- **Assertions** (`src/helpers/assertions.ts`): `ensureDefined()` / `ensureNotNull()`, not `!`. `assert()` for invariants.
- **Options:** user options are `DeepPartial<T>`. Defaults are in `src/api/options/*-defaults.ts`. Use `merge(clone(defaults), userOptions)`. Do not mutate the caller's object.
- **Events** (`src/helpers/delegate.ts`): subscribe with a `linkedObject` and clean up with `unsubscribeAll(this)`.
- **Cleanup:** classes that need teardown implement `IDestroyable.destroy()`. A chart is removed with `chart.remove()`.
- Share code between series kinds with plain functions, not base classes.

## Testing

- **Vitest** with **Chai** assertions (`expect(...).to.be.equal(...)`).
- Unit tests are in `tests/unittests/*.spec.ts`, with names that mirror the source files.
- Use branded casts in fixtures: `1000 as UTCTimestamp`.
- Visual tests (after Phase 0) are in `tests/visual/`. A golden image changes only in a commit that says why.
