# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository context

This is a rewrite of TradingView's `lightweight-charts` (v2.0.0) on the `20kb` branch. The goals are minimum bundle size and maximum performance in a browser. The design is data-oriented: point data is in typed arrays, and drawing is done by plain functions that read those arrays.

The package has no runtime dependency. The UMD bundle must stay below 20 kB gzip. `CLEANUP.md` has the measured numbers (bundle size, benchmark) and the items that are still open.

## Commands

| Task | Command |
|------|---------|
| Dev server (debug page) | `npm start` (Vite, serves `index.html`; add `?stream` for live updates) |
| Build library and types | `npm run build` (Vite lib mode → `dist/`, then `tsc` → `dist/types/`) |
| Type check | `npm run typecheck` (`tsc --noEmit`) |
| Run all tests | `npm test` (unit tests and pixel tests) |
| Run the pixel tests only | `npm run test:visual` |
| Run a single test file | `npx vitest run tests/unittests/<name>.spec.ts` |
| Filter by test name | `npx vitest run -t "<substring>"` |
| Benchmark | `npm run bench` (Node, no browser) |
| Lint | `npm run lint` |
| Unused code | `npm run knip` |

Verify changes with `npm run typecheck && npm test && npm run lint` before considering work complete. Then run `npm run build` and compare the gzip size of the UMD file with the limit. For a change in a data path or a draw path, also run `npm run bench` and compare with the table in `CLEANUP.md`.

Use `npm ci` for a clean install; `package-lock.json` is committed.

## Architecture

```
src/api/      Public surface. Converts user data and options at the edge.
src/gui/      The only DOM code: two canvases, size, frame loop, pointer input.
src/draw/     Plain functions that draw the chart on a context. No DOM.
src/series/   One file for each series type (a SeriesKind record).
src/model/    State: data store, scales, panes, series, crosshair, invalidation.
src/formatters/  Functions that make the text of a price or a date.
src/helpers/     Assertions, `Delegate`, `merge` / `clone`, nominal types.
```

Dependencies go down only. `src/model` does not import `src/draw`, `src/series` or `src/gui` (one exception: the `LineStyle` types in `src/draw/line-style.ts`). The chart core does not import a series kind: the user imports `Line` or `Candlestick`, so a bundler removes the kinds that are not used.

### Data (`src/model/data-store.ts`)

- `DataStore.times`: one sorted `Float64Array` of UTC seconds for the chart. The position of a time is its time point index. `DataStore.spans`: a `Uint8Array` with the tick-mark weight of each time point.
- `SeriesStore.values`: one `Float64Array` for each series, with `stride` values for each bar (1: value; 4: open, high, low, close). Row `r` is at time index `first + r`, or at `index[r]` when the series does not have consecutive time points.
- The time points of the chart are the union of the times of all series.
- `src/api/data-convert.ts` converts `BusinessDay` and string times to seconds, and copies the user's items into typed arrays. The library does not change and does not keep the user's objects.

### Frame (`src/gui/chart-widget.ts`, `src/draw/chart.ts`)

One frame, for an invalidation level above Cursor:

1. `model.applyRequests()`: the one-time autoscale of a pane, "fit content", a time range.
2. `layoutChart()`: measure the price axis, calculate the rectangles (`computeLayout()`), give the pane sizes to the model. It does this two times, because the axis width depends on the price range.
3. `model.resolveCrosshair()`: one calculation of the crosshair for each frame.
4. `drawStatic()` on the static canvas: background, and for each pane the grid, series and price axis; then separators and the time axis.
5. `drawOverlay()` on the overlay canvas: crosshair lines, markers and axis labels.

A Cursor frame does only steps 3 and 5.

Each region is a rectangle in the same canvas: the draw code translates and clips to it. There are two canvases for any number of panes.

### Series kinds (`src/model/series-kind.ts`, `src/series/`)

A series type is a record with `stride`, `defaults`, `draw()`, `range()` and `barColor()`. The shared code (`drawSeries()` in `src/draw/pane.ts`) finds the visible rows, fills the scratch arrays `xs` and `ys` in `SeriesDrawData`, and calls `kind.draw()`. A kind does not know about scales, panes or the store layout.

To add a series type: add one file in `src/series/` with the kind record and a function that returns a `SeriesSpec`, add its options to `SeriesOptionsMap` in `src/model/series-options.ts`, and export the function from `src/index.ts`. Share code between kinds with plain functions, not base classes.

### Scales

- `PriceScale` (`src/model/price-scale/price-scale.ts`): one file with the conversions for the four modes (normal, logarithmic, percentage, indexed to 100), autoscale, the tick marks and the drag state. A `PriceRange` is a plain `{ min, max }` that is not changed after it is made. The range is in the values that the scale shows (for example logarithms in the logarithmic mode).
- `TimeScale` (`src/model/time-scale/time-scale.ts`): bar spacing, right offset, visible bars (`BarsRange`, a plain `{ first, last }`), tick mark labels and the drag state. A method that changes the visible range also requests the autoscale of the panes and a Light frame.
- The widget calls the drag methods of the scales directly (`startScale` / `scaleTo`, `startScroll` / `scrollTo`, `endDrag`).
- A price formatter is a function `(price) => string` (`src/formatters/price-formatter.ts`).

### Panes

`ChartModel.panes()` is a list of `Pane` (stretch factor, one price scale for the axis, series). The series option `pane` selects the pane when the series is added; an index equal to the number of panes makes a new pane. An overlay series (`overlay: true`) gets its own price scale with no axis. The time scale, the time axis and the vertical crosshair line are shared.

## Performance rules

These are the reason this library exists. A change that works but breaks one of them is a regression.

- **No object for each point.** Point data is in typed arrays. No per-point `Map` entry.
- **No allocation in a draw path or a tick path.** Reuse scratch buffers (see `drawData` in `src/draw/pane.ts`). No closures, `bind`, spread, `map` or `filter` there.
- **Ingest.** An in-place tick writes values in place and does not touch the time scale (`UpdateKind.InPlace`). An append is amortized O(1). An update that is older than the last bar of the series throws.
- **Lookup.** Time to index is a binary search, or arithmetic for a series with consecutive time points. No linear scan over all points.
- **Tiered invalidation** (`InvalidationLevel` in `src/model/chart-model.ts`): `None < Cursor < Light < Full`. Cursor draws only the overlay. Light keeps the width of the price axis or makes it wider; Full calculates it again. Use the lowest level that is correct.
- **One frame for all changes.** An invalidation is one number: the widget keeps the highest level and one `requestAnimationFrame`. An invalidation does not draw and does not allocate. The frame takes the level before it draws; changes that the frame's own prepare step makes in the model are drawn by that frame.
- **Draw only what is visible.** `drawSeries()` finds the visible rows with a search; loops run over those rows only.
- **Tick marks** (`src/model/time-scale/tick-marks.ts`) are cached. New time points at the end build only the end again. A change of the minimum distance between marks (a zoom) builds all marks again: this is the one cost that is linear in the number of time points during interaction.
- **Cheap inner loops.** Write `fillStyle` / `strokeStyle` only when the value changes. One `stroke()` for a line. No `save` / `restore` in a bar loop. `tests/unittests/draw-calls.spec.ts` checks these rules.
- **Pixels.** Series draw in device pixels with rounding. The device pixel ratio is stored when the canvas size changes, not read in a draw path.
- **Cache behind invalidation:** text width, parsed colors, formatted labels, label metrics.

## Bundle size rules

- A public method of an internal class keeps its name in the bundle; a `#private` member and a module-level function do not. Thus a small module-level function costs less than a class, and a method that only calls a different object is cost with no function.
- No message text for a condition that cannot occur. `ensureNotNull()` is sufficient.
- No per-change object where a number or a field is sufficient (see `InvalidationLevel`).
- An exported `const enum` must give each member a number value in the declaration (`Pane = 1`). The plugin `inlineConstEnums` in `vite.config.ts` replaces each use with the value, because the bundler compiles each file alone and does not do this for an enum from a different file. Vitest uses the same plugin.

## Conventions

- Public API interfaces use the `I` prefix (`IChartApi`). `src/index.ts` is the only public entry.
- Private members use `#private` syntax. Protected members use the `_` prefix.
- `const enum` for internal flag sets (see "Bundle size rules"). Enums that the user can import are normal enums.
- **Tab indentation.**
- Target ES2022, strict mode, `moduleResolution: bundler`, `verbatimModuleSyntax`, ES modules only.
- **Nominal types** (`src/helpers/nominal.ts`): `Coordinate`, `TimePointIndex`, `UTCTimestamp`. Cast explicitly (`42 as Coordinate`).
- **Assertions** (`src/helpers/assertions.ts`): `ensureDefined()` / `ensureNotNull()`, not `!`. `assert()` for invariants.
- **Options:** user options are `DeepPartial<T>`. Defaults are in `src/api/options/*-defaults.ts` and in each series kind. Use `merge(clone(defaults), userOptions)`. Do not mutate the caller's object: clone it first.
- **Events** (`src/helpers/delegate.ts`): subscribe with a `linkedObject` and clean up with `unsubscribeAll(this)`.
- A chart is removed with `chart.remove()`.
- The series that was added last is drawn first (below the other series).

## Testing

All tests run in Node. No browser, Playwright, Puppeteer or DOM emulator.

- **Unit tests:** `tests/unittests/*.spec.ts`. Vitest with Chai assertions (`expect(...).to.be.equal(...)`). Use branded casts in fixtures: `1000 as UTCTimestamp`.
- **Pixel tests:** `tests/visual/`. `tests/helpers/headless-chart.ts` makes a chart with no DOM (the real model and the real draw functions), `@napi-rs/canvas` draws it, and `pixelmatch` compares it with a PNG in `tests/visual/golden/`. Cases with no text must match exactly, at pixel ratios 0.75, 1, 1.5 and 2. Cases with text permit a small difference. On failure, see `tests/visual/out/<name>.diff.png`.
- **Golden images change only in a commit that says why.** Record with `UPDATE_GOLDEN=1 npm run test:visual`. Do not record to make a test pass.
- **Draw-call tests:** `tests/helpers/recording-context.ts` records each canvas call as text. `tests/unittests/draw-calls.spec.ts` uses it for the performance rules and for one snapshot.
- **Not covered by tests:** `src/gui/` (the `ResizeObserver`, the frame loop, Pointer Events). Check it with `npm start` in a browser, and touch input on a device.
