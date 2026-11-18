# Work order: data-oriented rewrite of the 20kb fork

You are working in `/Users/ed/repos/lightweight-charts`, branch `20kb`. This is a pared-down fork of TradingView lightweight-charts v2. Its purpose is minimum bundle size and maximum performance in a browser.

This file replaces the 2026-08 work order. It merges two audits:

- **2026-08**: dead code and bugs (model, GUI, API, views, renderers).
- **2026-11**: data-oriented design (storage layout, draw path, canvas structure, platform replacements).

The 2026-11 audit found that the storage and draw layers must be replaced, not repaired. Thus most of the 2026-08 deletion items for the model, views and renderers are superseded. The section "Superseded items" lists them.

Line numbers were correct at audit time. **Find each one again with grep before you edit.**

## Ground rules

- One commit for each phase. Tab indentation. No `!` non-null assertions (use `ensureNotNull` / `ensureDefined`).
- After each phase: `npm run typecheck && npm test`, `npm run lint`, `npm run knip`, and the test gates in "Test gates for each phase".
- After each phase: record the bundle size and the benchmark numbers in the table in "Baseline and targets".
- Do not add a per-point object, a per-point `Map` entry, or an allocation in a draw path or a tick path.
- A public API change is permitted only where this file says so. Write each one in the commit message.
- When a phase deletes code, delete its unit tests in the same commit.
- A golden image changes only in a commit that says why. Do not update golden images to make a test pass.

## Decisions (user, 2026-11-18)

1. **Multiple panes stay, and become a supported feature.** The current code has the model for panes but no public API, and the separators have bugs. Phases 4 and 7 make panes work. See "Panes" in Phase 4 and the layout in Phase 7.
2. **Series API: one argument that holds the type and the options.** `chart.addSeries(Line({ color: 'red' }))`. `Line` and `Candlestick` are exported functions that return a series spec. This form also permits tree-shaking, thus `addLineSeries` and `addCandlestickSeries` are removed in Phase 4. `series.applyOptions(partial)` does not change.
3. **`CLAUDE.md` follows this plan.** It was rewritten on 2026-11-18. The old Performance Model rules on `PlotRow` storage and the chunked min/max cache do not apply.

## Baseline and targets

Measured 2026-11-18 with esbuild + Node on the real source (candlestick series, one-minute bars).

| Metric | Baseline | Target |
|---|---|---|
| Bundle, minified (esbuild, `fancy-canvas` external) | 125.8 kB | < 60 kB |
| Bundle, gzip | 35.6 kB | < 20 kB |
| Retained memory for each bar (includes caller input, which `DataLayer` keeps) | 579 B | < 50 B |
| `setData`, 100,000 bars | 69 ms | < 10 ms |
| Append one bar at 100,000 bars | 113 µs | < 2 µs, constant |
| Append one bar at 1,000,000 bars | 1,221 µs | < 2 µs, constant |
| View item rebuild for each data tick at 100,000 bars | 2.9 ms | 0 (step removed) |
| Tick-mark rebuild for each in-place tick at 100,000 bars | 0.49 ms | 0 (skipped) |
| Classes / interfaces in `src` | 75 / 118 | report only |
| Canvas elements for one chart | 7 for one pane | 2 for any number of panes |

Largest modules now (minified bytes): `price-scale.ts` 8,765; `pane-widget.ts` 8,459; `price-axis-widget.ts` 7,989; `time-scale.ts` 7,028; `chart-widget.ts` 6,245; `time-axis-widget.ts` 6,031; `chart-model.ts` 5,833; `plot-list.ts` 4,923; `mouse-event-handler.ts` 4,757. By directory: model 47.8 kB, gui 38.5 kB, api 10.9 kB, views 10.4 kB, renderers 9.2 kB.

## Phase 0: environment and safety net (do first)

### 0.1 Repair the install

`node_modules` has no `vite` and no `vitest`, and `fancy-canvas` is 2.1.0 while `package.json` pins 0.2.1. There is no lock file. Run `npm install`, commit the lock file, and make sure that `npm run typecheck`, `npm test` and `npm run build` pass before any other work.

### 0.2 Benchmark script

Add `npm run bench` (a Node script, no browser). It must print the metrics in the table above for 10,000, 100,000 and 1,000,000 bars. Use `node --expose-gc` for the memory figure.

### 0.3 Pixel tests (no browser)

A renderer takes only a canvas context and plain data. Thus a native canvas in Node is sufficient. Do not add Playwright, Puppeteer, jsdom or Vitest browser mode.

1. Add dev dependencies `@napi-rs/canvas` (Skia, prebuilt binaries) and `pixelmatch`.
2. Add `tests/visual/harness.ts`:
	- `renderCase(width, height, pixelRatio, draw)`: make a canvas of `width * pixelRatio` by `height * pixelRatio`, call `draw(ctx, pixelRatio)`, return the PNG bytes.
	- `expectGolden(name, png)`: compare with `tests/visual/golden/<name>.png`. On failure, write `<name>.actual.png` and `<name>.diff.png` to `tests/visual/out/` (in `.gitignore`).
	- Environment variable `UPDATE_GOLDEN=1` writes the golden file.
3. Add `tests/visual/fixtures.ts`: fixed data sets with no randomness. At minimum: 50 candles with up, down and flat bars; 500 candles (bar spacing less than 2 px); a line with a gap; one point; an empty series; a series that is fully left of the viewport.
4. Add one font file to `tests/visual/` and register it with `GlobalFonts.registerFromPath`. Use that font in all cases. A system font makes the images different on each computer.
5. Put the cases in two groups:
	- **Geometry** (candles, line, grid, crosshair lines): must match exactly, threshold 0.
	- **Text** (price labels, time labels, watermark): small threshold, and a maximum count of different pixels.
6. Run each geometry case at pixel ratios 0.75, 1, 1.5 and 2. The rounding code is where the bugs are.
7. Add `npm run test:visual`. Add it to the "after each phase" commands.
8. **Record the golden images from the current renderers.** Drive each renderer directly: construct it, call `setData` with hand-made items, call `draw`. The widgets need a DOM; the renderers do not. Do the Phase 1 fixes for items 1, 4, 6 and 7 before you record, so that the golden images show correct output.

These images are the contract for Phases 3 to 5. The store and the draw functions must give the same pixels from the same input.

## Phase 1: small bug fixes (independent)

From the 2026-08 audit. All are still open.

1. `src/renderers/walk-line.ts` `walkLine`: the guard is `points.length === 0` only. Add an empty-range guard (`visibleRange.from >= visibleRange.to`). A Line series that is fully left of the viewport gives `{from: len, to: len}` and crashes on `points[from].x`.
2. `src/api/chart-api.ts:93`: `visibleBarsChanged().subscribe(cb.bind(this))` has no `linkedObject` argument, but `remove()` uses `unsubscribeAll(this)`. Pass `this` as the second argument.
3. `src/api/chart-api.ts:134`: `(this.#dataLayer as unknown as null)` is an expression with no effect. Add `= null`.
4. `src/renderers/candlesticks-renderer.ts:136`: `barSpacing > 2 * borderWidth` compares CSS pixels with bitmap pixels. Use `barSpacing * pixelRatio`.
5. `src/model/price-scale/price-scale.ts:882`: `marginBelow = Math.max(marginAbove, ...)` is a copy error. Use `Math.max(marginBelow, ...)`.
6. **Paired fix, do both or neither:** `src/views/pane/crosshair-pane-view.ts` `renderer()` does not reset `#invalidated = false`, AND `Crosshair.updateAllViews()` in `src/model/crosshair.ts` does not call `this.#paneView.update()`. If you fix only the first, the crosshair freezes.
7. `src/renderers/grid-renderer.ts:38` and `src/renderers/crosshair-renderer.ts:49,57`: `Math.floor(pixelRatio)` gives line width 0 at browser zoom-out. Use `Math.max(1, Math.floor(pixelRatio))`.
8. `src/gui/chart-widget.ts:290` (in `takeScreenshot`): delete the stray `ctx.restore()` in the `drawScaled` callback.
9. `src/gui/pane-widget.ts` and `src/gui/time-axis-widget.ts` `destroy()`: add `model.mainPriceScaleOptionsChanged().unsubscribeAll(this)`.

New in 2026-11:

10. **Tick-mark priority (confirm first).** `TickMarks.build` (`src/model/time-scale/tick-marks.ts:112`) iterates `#marksBySpan.values()`, which is `Map` insertion order. Upstream iterated spans from high to low. The first point always has span 20, thus the lowest span goes first. A test in the audit showed that all accepted marks had span 20 and no day, month or year mark was accepted. Write a unit test that fails, then iterate spans in descending order. Phase 6 replaces this code, but the test must stay.

Items 1, 4, 6 and 7 are in code that Phase 4 deletes. Fix them anyway, for the reason in step 0.3.8.

The 2026-08 separator bugs (`if (i > 1)` at `src/gui/chart-widget.ts:492`, and the `takeScreenshot` crash with more than one pane) are not in this phase. No public API can make a second pane now, and Phase 7 replaces that code.

## Phase 3: columnar store

(There is no Phase 2. The decision gates that were Phase 2 are closed; see "Decisions".)

**Goal:** one typed-array store replaces `PlotList`, `PlotRow`, `SeriesData`, `TimePoint`, `TimePointData`, `TimePoints` and the three Maps in `DataLayer`.

**Why:** each bar now costs approximately 6 heap objects, one `Map` for each time point, and 3 hash entries. `PlotList.#append` uses `concat` (`plot-list.ts:414`), thus each new bar copies the full array. `TimePoints.indexOf` is a linear scan (`time-points.ts:85`).

**Design:**

- `times: Float64Array`, UTC seconds, sorted, with capacity that doubles. The time point index is the position in this array. All panes share it.
- Each series: `values: Float64Array` with `stride` values for each bar (1 for Line, 4 for Candlestick: open, high, low, close).
- Each series: `first: number`, the time index of its first bar, when all series share the same time steps. If two series do not align, add an `index: Int32Array` for that series only. Find the visible window in it with a binary search.
- A gap in a series is `NaN` in `values`.
- `spans: Uint8Array`, the tick-mark weight for each time point, calculated in the ingest pass.
- One chart flag `isBusinessDay`. Convert `BusinessDay` and string times to seconds in `SeriesApi.setData` / `update`. Convert back in `#convertMouseParams` and `getVisibleRange`. Do not mutate the caller's objects and do not keep them.

**Ingest rules (keep these):**

- `setData`: one pass to fill, one merge of sorted time arrays when a second series is added.
- `update` with the last timestamp: write `stride` values in place. Return a flag that says "no time scale change".
- `update` with a newer timestamp: append. Amortized O(1).
- `update` with an older timestamp: throw, as now.

**Transition:** the views and renderers still exist in this phase. Fill their item arrays from the store, so that the Phase 0 golden images are still the test. Phase 4 removes the item arrays.

**Done when:** `npm run bench` meets the memory, `setData` and append targets, and `npm run test:visual` passes with no golden change.

## Phase 4: frame record, draw functions, `SeriesKind`, panes

**Goal:** delete `src/views/`, `src/renderers/`, `src/model/data-source/`, `series-bar-colorer.ts` and `palette.ts` (approximately 2,400 lines). Replace them with plain functions that read the store.

### Frame record

Calculate it one time for each frame, in the draw step. The x part is the same for all panes. Each pane has its rectangle and its price scales.

```ts
interface Frame {
	from: number; to: number;        // visible time index range, [from, to)
	xScale: number; xOffset: number; // x = xOffset + i * xScale  (CSS px)
	pixelRatio: number;
	panes: PaneFrame[];
}
interface PaneFrame {
	top: number; height: number;     // rectangle in the chart, CSS px
	scales: ScaleFrame[];            // y = yOffset + transform(price) * yScale
}
```

### Series kind and series spec

A series type is a record, not a class:

```ts
interface SeriesKind<Opts> {
	stride: 1 | 4;
	defaults: Opts;
	draw(ctx, frame, scale, values, from, to, opts): void;
	range(values, from, to, out: Float64Array): void;  // min/max for autoscale
	lastColor(values, i, opts): string;                // price label, crosshair marker
	// optional: aggregate() for Phase 5 level of detail
}
```

The public API takes one object that holds the kind and the options:

```ts
export function Line(options?: LineSeriesPartialOptions): SeriesSpec<'Line'>;
export function Candlestick(options?: CandlestickSeriesPartialOptions): SeriesSpec<'Candlestick'>;

const series = chart.addSeries(Line({ color: 'red', pane: 1 }));  // ISeriesApi<'Line'>
```

- `SeriesSpec` is `{ kind, options }`. The chart core does not import a series kind, thus a bundler removes the kinds that the user does not import.
- Remove `addLineSeries` and `addCandlestickSeries`. This is a breaking change; write it in the commit message.
- `series.applyOptions(partial)` stays as it is.

### Draw rules

- Draw functions read `values` directly. They calculate `x` from the index and `y` from the scale factors. No item array, no `_fillRawPoints`, no `setData` objects.
- Candles: calculate the direction (`close >= open`) in the loop. Draw two passes (up, then down), thus each pass writes `fillStyle` one time.
- Line: one path, one `stroke()`. Start a new sub-path at `NaN`.
- Shared helpers are plain functions (`walkLine`, the up/down pass loop). No base class.
- Grid, crosshair, watermark, price labels and time labels are also plain functions: `drawGrid(ctx, frame, pane, ...)` and so on.
- Shared code owns: ingest, visible range, scale factors, crosshair lookup, the last-value label, autoscale. A series kind must not implement these again.
- Keep physical-pixel rounding for series (crisp edges at each device pixel ratio).

### How the planned types fit

Do not implement these now. This table is the proof that the design scales.

| Type | Stride | Draw | Range |
|---|---|---|---|
| Line | 1 | one path, one `stroke()` | column 0 |
| Area | 1 | line path, then close to the bottom and `fill()` | column 0 |
| Baseline | 1 | line path two times, each with a clip rectangle above or below the base price | column 0 |
| Histogram | 1 | one `fillRect` for each bar | column 0 and the base |
| Candlestick | 4 | two passes (up, down) | columns 1 and 2 |
| HLC / OHLC bars | 4 | two passes, three thin rectangles for each bar | columns 1 and 2 |

Care points for later types:

- A color for each bar is an optional `Uint32Array` column on the series. Do not add it to the stride.
- A histogram needs the maximum or the sum for level of detail, not the min/max pair. This is why `aggregate` is optional on the record.
- Price lines, markers and hit tests are shared passes over the store. Do not put them in `SeriesKind`.

### Panes

Panes are a supported feature. The model for a pane becomes plain data:

```ts
interface Pane {
	stretch: number;        // relative height
	scales: PriceScale[];   // the pane's own price scales
	series: Series[];       // draw order = array order
}
```

- **Create:** the series option `pane: number` (default 0). If `pane` is equal to the pane count, the chart makes a new pane. If it is larger, throw.
- **Remove:** when the last series of a pane is removed, remove the pane. Pane 0 always exists.
- **API:** `chart.panes(): IPaneApi[]`, with `IPaneApi.height()` and `IPaneApi.setStretchFactor(n)`. Confirm this shape with the user at the start of Phase 4; it is the only open API question.
- **Shared between panes:** the time scale, the `times` array, the visible range, the vertical crosshair line, the time axis.
- **For each pane:** price scales, autoscale, grid, the horizontal crosshair line (only in the pane under the pointer), price labels.
- **Price axis width:** one value for the chart, the maximum over all panes, so that the panes align.
- Delete the `DataSource` hierarchy, the z-order sort and the main-source search. `Series` becomes a small record: kind, options, values, pane index, price scale reference, formatter. `PriceRange` becomes two numbers.

**Done when:** the view item rebuild metric is 0, the directories listed in the goal do not exist, the Phase 0 golden images pass with no change, and the new tests in "Test gates" exist.

## Phase 5: autoscale and level of detail

1. **Delete the chunked min/max cache.** A linear scan of the visible window in a `Float64Array` costs less than the `Map` lookups. Scan one time for each Light invalidation, as now (`_invalidatedForRange`). Confirm with `npm run bench` at 100,000 visible bars before you delete.
2. **Level of detail.** When `barSpacing * pixelRatio < 1`, aggregate for each pixel column (minimum and maximum; first and last for candles) into a scratch buffer that is allocated one time and reused. Draw from the scratch buffer. The draw cost then depends on the canvas width, not on the bar count. Add a bench case: 1,000,000 visible bars must draw in less than 4 ms.

## Phase 6: time scale and tick marks

1. **Skip the rebuild on an in-place tick.** Use the flag from Phase 3. An in-place tick must not touch tick marks, the time axis or `visibleBars`.
2. **Build tick marks for the visible window only.** Read `spans` for `[from, to)`. Apply the spacing filter from high span to low span. This removes `#marksBySpan`, `#marksByIndex`, the full sort on append, and the full scan in `TimeScale.marks()` (`time-scale.ts:274`).
3. **Label cache.** Use the timestamp as the cache key (no `Date` allocation on a hit). Use 6 cached `Intl.DateTimeFormat` objects with `timeZone: 'UTC'`.
4. **Skip the time-axis repaint** on a Light frame when the time scale did not change.
5. Delete `ChartModel.updateTimeScaleBaseIndex`'s dead `earliestRowIndex` block. The live compensation is the `rightOffset < 0` logic in `TimeScale.update`. Write that in a comment.

## Phase 7: GUI

Read `perf-summary-2.md` Deep dive A before you change the RAF code.

1. **Layout as data.** Add a pure function `layout(width, height, panes, axisSizes): Layout`. It returns a rectangle for each pane, each price axis, each separator, the time axis and the corners. Pane heights come from the stretch factors. No DOM in this function.
2. **Draw with no DOM.** Add `drawStatic(ctx, frame, layout, model)` and `drawOverlay(ctx, frame, layout, model)`. They set `translate` + clip for each rectangle and call the Phase 4 draw functions. The DOM code only makes the canvases, observes size, and sends pointer events. This split is what makes the full-chart tests in "Test gates" possible.
3. **Two canvases.** One static canvas and one overlay canvas in one `div`, for any number of panes. Delete the `<table>`, `price-axis-stub.ts`, the three widget classes, and most of `takeScreenshot` (it becomes one `drawImage` of each canvas).
4. **Separators.** A separator is a 1 px strip in the layout, drawn on the static canvas. Delete `pane-separator.ts` and its DOM elements. Drag to resize: the pointer handler finds the separator by position (with a grab margin of some pixels), sets the cursor, and changes the two stretch factors. This replaces code that was constructed only with `disableResize = true`.
5. **Replace `fancy-canvas`.** One `ResizeObserver` (approximately 30 lines). Use `devicePixelContentBoxSize` where it exists, and `contentRect * devicePixelRatio` as the fallback (Safari). Store `pixelRatio` in a field; do not read `devicePixelRatio` in a draw path. Delete the "even size" workarounds and the `canvasConfigured` handlers. The package then has no runtime dependency.
6. **Pointer Events.** Replace the mouse and touch paths in `mouse-event-handler.ts` with `pointerdown` / `pointermove` / `pointerup`, `setPointerCapture` and CSS `touch-action`. One handler finds the region (pane, price axis, time axis, separator) from the layout. Use `pointerType`, and delete `support-touch.ts` (this also removes the module-scope `window` read). Test long-tap and pinch on a touch device before you merge.
7. **Resolve the crosshair one time for each frame.** One drag event now moves the crosshair three or four times and fires the public callback each time. Set a dirty flag and resolve it in the draw step. Fire `crosshairMoved` at most one time for each frame.
8. **Overlay clears.** A Cursor frame clears and draws only the overlay canvas.
9. **Delete `LabelsImageCache`.** Draw price labels with `fillText`, as the time axis does.
10. **RAF mask ownership** (`#invalidateHandler`): take ownership of the mask before the draw (`const mask = this.#invalidateMask; this.#invalidateMask = null`). A Full escalation during a Light draw must still apply in the same frame. This removes the wasted RAF after each Full draw.
11. **Layout recalculation:** set sizes for all regions, then recalculate one time.
12. Cache the font string when options change. Do not build it in a draw path.
13. Remaining dead code in files that stay (from 2026-08): `ChartWidget.#priceAxisWidthChanged` and `#priceAxisWidth`; the duplicate `drawScaled` in `canvas-utils.ts`; `InvalidateMask.#force`; `Crosshair.#subscribed`.

## Phase 8: platform replacements and API layer

1. **Colors.** The runtime needs two functions from `color.ts` (237 lines): text contrast color and "remove transparency". Replace the file with one function of approximately 25 lines: normalize through `ctx.fillStyle = c; ctx.fillStyle`, then cache the result in a `Map`. Named and `hsl()` colors then work.
2. **Price format.** `fractional` is always `false` and `minMove2` is always `undefined`. Replace `PriceFormatter` with rounding to `minMove` and `toFixed(precision)`. Do not use `Intl.NumberFormat` here.
3. **Date format.** Replace the closure table in `date-format.ts` with one `replace(/yyyy|yy|MMMM|MMM|MM|dd/g, ...)` and 12 cached month names for each locale. Merge `DateFormatter`, `TimeFormatter` and `DateTimeFormatter` into one function. Drop the ignored `locale` parameters.
4. **One options tree.** `ChartModel` owns one options object. Scales read through it. Delete the `optionsChanged`, `mainPriceScaleOptionsChanged` and `optionsApplied` delegates and the double apply. Use the lowest invalidation level that is correct for the changed keys, not always Full.
5. **Price tick marks.** `#tickSpan` allocates 3 calculators and 7 arrays for each call. Use module-level functions. Do not make a new `PriceTickMarkBuilder` for each option change.
6. **API wrappers.** Merge `PriceScaleApi` and `CandlestickSeriesApi` into their callers. Replace `#seriesMap` / `#seriesMapReversed` with a back-pointer on the series. Fire the three public events directly, not through a second `Delegate`. `chart.priceScale()` needs a pane argument now (default 0).
7. **`Delegate.fire`** allocates 2 arrays for each call. Iterate with an index and a "changed during fire" guard.
8. **`TextWidthCache`:** use a `Map`. Do not run the digit `replace` on a cache hit.
9. **Caller input.** `toInternalOptions`, `patchPriceFormat` and `fillUpDownCandlesticksColors` mutate the caller's object. Clone first. `merge` aliases nested source objects when the destination key is undefined (`strict-type-checks.ts:16`); copy them. `options()` must return a clone in all API objects. Keep `clone`; `structuredClone` throws on function values.

## Phase 9: packaging

- `package.json`: `main` points to a file that does not exist, `module` does not match the Vite output, and `typings` is not generated. Correct the fields and add a `d.ts` build (ask the user which tool).
- SSR: `chart-options-defaults.ts:24` reads `navigator.language` at module scope. Make it lazy. (`support-touch.ts` goes in Phase 7.)
- Export `LineStyle` and `LineType` as values from `src/index.ts`. Delete the re-export block in `src/api/create-chart.ts`.
- Confirm tree-shaking: build a test entry that imports only `createChart` and `Line`, and check that the output has no candlestick code.

## Phase 10: documents

`CLAUDE.md` was rewritten on 2026-11-18. It has a "Current code" section and a "Target design" section. At the end of each of Phases 3, 4 and 7, move the finished parts from "Target design" into the main text and delete the matching "Current code" text. At the end of the work:

- Delete the "Current code" section.
- Record the final numbers from "Baseline and targets".
- Delete `perf-summary.md` and `perf-summary-2.md`, or mark them as history.

## Test gates for each phase

Three types of test. None needs a browser.

**Pixel tests** (`npm run test:visual`, harness from step 0.3): compare with golden PNG files.

**Draw-call log tests:** a fake context (`tests/helpers/recording-context.ts`) records each call and each property write as one line of text. Compare with a Vitest snapshot. Also assert rules as counts, for example "one `stroke()` for a line". Add the helper in Phase 4. Do not snapshot the old renderers.

**Data tests:** normal unit tests on the store, the frame record and the layout function.

| Phase | Pixel tests | Draw-call log tests | Data tests |
|---|---|---|---|
| 0 | Record golden images from the current renderers | none | none |
| 1 | Record again only for items 1, 4, 6, 7; say why in the commit | none | Failing test for item 10, then the fix |
| 3 | Must pass with no golden change | none | Store: `setData`, in-place update, append, older update throws, two series that do not align, gaps |
| 4 | Must pass with no golden change. Add cases: two panes with different stretch; one series in each pane | Add. Rules: Line = 1 `stroke()`; candle pass = at most 2 `fillStyle` writes; no `save` / `restore` in a bar loop | Frame record: x and y for known inputs at each pixel ratio |
| 5 | Add cases for bar spacing less than 1 device pixel. Cases with spacing of 1 or more must not change | Rule: at most 3 `fillRect` for each pixel column | Aggregate buffer against a simple reference function |
| 6 | Add time-axis cases (text group): minute, day, month and year steps | none | Tick marks: high span wins; in-place tick does no rebuild (count the calls) |
| 7 | Add full-chart cases through `drawStatic` + `drawOverlay`: one pane, two panes, three panes, crosshair in pane 2, left and right price axis | Rule: a Cursor frame makes no call on the static context | Layout: rectangles sum to the chart size; separator positions; stretch change through drag |
| 8 | Text group must pass. Price label text can change only where the commit says so | none | Formatters against the old output for a table of inputs; color function for hex, `rgb()`, `rgba()`, named, `hsl()` |

**Limits of these tests:**

- Skia in Node is not the same as Chrome or Safari. The tests find regressions in this code. They do not find differences between browsers.
- The `ResizeObserver` code and the Pointer Events code need a real browser. Keep them thin. Check them manually with `npm start` on a desktop browser and on a touch device at the end of Phase 7.

## Superseded items from 2026-08

Do not do these. The code is deleted in the phase shown.

| Item | Deleted in |
|---|---|
| Palette removal, `Bar['value']` 5-tuple to 4-tuple | Phase 3 |
| `PlotList` generic machinery, `skipEmptyValues`, row search caches, `add` / `remove` / `range` / `contains` | Phase 3 |
| `TimePoints.closestIndexLeft`, prepend branch of `TimePoints.merge` | Phase 3 |
| Inline `SeriesData` into `Series`, `#updateBarFunction` | Phase 3 |
| Hit-test and hover plumbing in renderers and pane views | Phase 4 |
| Fold `LinePaneViewBase` and `BarsPaneViewBase`, delete `TimeAxisView`, merge the horizontal line views, `PriceAxisView` constructor injection | Phase 4 |
| `lastValueData` overloads | Phase 4 |
| Per-bar binary search in `SeriesCandlesticksPaneView._createRawItem` | Phase 4 |
| `PaneWidget.#drawWatermark`, `drawLine` in `draw-line.ts` | Phase 4 |
| `TickMarks.#minIndex` / `#maxIndex` | Phase 6 |
| "Delete multi-pane" decision gate; separator off-by-one fix; `TimeAxisWidget.update()` | Phase 7 (panes are kept and rebuilt) |
| `PriceScale.priceRangeChanged()` / `internalHeightChanged()` | Phase 8 |

## Explicitly do NOT

- Do not make the prepend path of `TimePoints.merge` work. History prepend is not supported unless the user asks for it.
- Do not fix the crosshair-pane-view `#invalidated` reset without the `Crosshair.updateAllViews` change (Phase 1 item 6).
- Do not keep the caller's data objects after ingest.
- Do not add a base class for series kinds. Share code through plain functions.
- Do not make one canvas for each pane. Panes are rectangles in the two canvases.
- Do not import a series kind from the chart core. That stops tree-shaking.
- Do not move rendering to WebGL, WebGPU, a worker or `OffscreenCanvas` in this work order. Measure after Phase 5 first.
