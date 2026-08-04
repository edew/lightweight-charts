# Cleanup task: act on the 2026-08 audit findings

You are working in `/Users/ed/repos/lightweight-charts`, branch `20kb` — a pared-down fork of TradingView lightweight-charts v2 whose whole purpose is minimal bundle size. Read `CLAUDE.md` first and obey its Performance Model section throughout: no linear scans over all points on hot paths, keep O(1) streaming ingest, keep tiered invalidation (`None < Cursor < Light < Full`), keep RAF batching/merge semantics.

A full audit was completed. This file is the work order. Line numbers below were correct at audit time — **verify each with grep/read before editing; do not trust them blindly.**

## Ground rules

- After every phase: `npm run typecheck && npm test` (all 270 tests must pass), plus `npm run lint` and `npm run knip` (both configured; treat shrinking their output as part of the goal).
- Track bundle size: `npm run build` printed `dist/lightweight-charts.mjs 165.81 kB / gzip 40.87 kB` at audit time. Report the delta when done — deletions should shrink it.
- One commit per phase, tab indentation, no `!` non-null assertions (use `ensureNotNull`/`ensureDefined`).
- Some dead code is exercised only by unit tests (`PlotList.add/remove/range/contains`, `TimePoints.closestIndexLeft`, helpers like `ceiledOdd`, `optimalBarWidth`, `stringToBusinessDay`, `colorWithTransparency`). Deleting the code means deleting/trimming those tests too — that is expected and fine.

## Phase 1 — small verified bug fixes (do first, independent)

1. `src/renderers/walk-line.ts` `walkLine`: guard is `points.length === 0` only; add empty-range guard (`visibleRange.from >= visibleRange.to`) — an all-left-of-viewport Line series produces `{from: len, to: len}` and crashes on `points[from].x`.
2. `src/api/chart-api.ts:93`: `visibleBarsChanged().subscribe(cb.bind(this))` lacks the `linkedObject` arg, but `remove()` cleans up with `unsubscribeAll(this)` — pass `this` as second arg.
3. `src/api/chart-api.ts:134`: `(this.#dataLayer as unknown as null)` is a no-op expression — missing `= null`.
4. `src/renderers/candlesticks-renderer.ts:136`: `barSpacing > 2 * borderWidth` mixes CSS px (barSpacing) with bitmap px (borderWidth). Use `barSpacing * pixelRatio`.
5. `src/model/price-scale/price-scale.ts:882`: `marginBelow = Math.max(marginAbove, ...)` copy-paste typo → `Math.max(marginBelow, ...)`.
6. **Paired fix — do both or neither:** `src/views/pane/crosshair-pane-view.ts` `renderer()` never resets `#invalidated = false` (add it), AND `Crosshair.updateAllViews()` in `src/model/crosshair.ts` never calls `this.#paneView.update()` (add it). Fixing only the first freezes the crosshair; today they mask each other.
7. `src/renderers/grid-renderer.ts:38` and `src/renderers/crosshair-renderer.ts:49,57`: `Math.floor(pixelRatio)` line widths become 0 at browser zoom-out (canvas ignores lineWidth 0, silently reuses stale state). Use `Math.max(1, Math.floor(pixelRatio))` like the tick code already does.
8. `src/gui/chart-widget.ts:290` (inside `takeScreenshot`): stray `ctx.restore()` inside the `drawScaled` callback — delete.
9. `src/gui/pane-widget.ts` and `src/gui/time-axis-widget.ts` `destroy()`: add `model.mainPriceScaleOptionsChanged().unsubscribeAll(this)` to match their constructor subscriptions.

## Phase 2 — decision gate: multi-pane

The model keeps full multi-pane machinery (pane arrays, stretch factors, `pane-separator.ts`, per-pane invalidation) but `createSeries` hardcodes pane 0, nothing public creates panes, and separators are off-by-one (`if (i > 1)` at `src/gui/chart-widget.ts:492` should be `i > 0`; multi-pane `takeScreenshot` crashes on missing separator).

**Ask the user: delete multi-pane support entirely, or fix it?** Do not proceed on this item without an answer. (Regardless of the answer, the separator *drag/resize* half is dead either way — constructed only with `disableResize = true` — and can go in Phase 3.)

## Phase 3 — bulk deletion of stripped-feature residue

All verified dead; deletion must not change behavior (tests prove it):

- **Palette**: delete `src/model/palette.ts`, `Series.#palette`/`palette()`/its `clearData` use, the ignored `palette` params in `src/api/data-layer.ts` value functions, and shrink `Bar['value']` from 5-tuple to 4-tuple (slot 4 is always `null`, never read). Update `SeriesPlotIndex` accordingly.
- **Hit-test/hover plumbing**: no renderer implements `hitTest`; remove `IPaneRenderer.hitTest`, `PaneWidget.#hitTestPaneView` and its consumers, `clickHandler`/`moveHandler` on `IPaneView`, and the always-`false`/`undefined` `isHovered`/`hitTestData` params threaded through every renderer `draw()`/`drawBackground()`.
- **PlotList generic machinery** (`src/model/plot-list.ts`): replace `PlotFunctionMap`/`PlotInfo`/`seriesPlotFunctionMap` with direct tuple indexing (`value[1]`/`value[2]`/`value[3]`) in `#plotMinMax`; keep the chunked min/max cache exactly as is. Delete the `skipEmptyValues` path (`#emptyValuePredicate`, `#nonEmptyNearestLeft/Right`, `#rowSearchCacheWithoutEmptyValues`), and `#rowSearchCache` too (both caches are cleared everywhere but never `.set`/`.get` — verified). Delete dead methods `add`, `remove`, `range`, `contains` and the `#shareRead` sub-range machinery.
- **Dead time-points code**: `TimePoints.closestIndexLeft` (object-compare bug inside, zero callers) and the negative-index prepend branch of `TimePoints.merge` (writes negative array keys; unreachable). Either delete the prepend branch or leave a `throw` explaining prepend is unsupported.
- **Dead compensation block**: `ChartModel.updateTimeScaleBaseIndex` — all call sites pass `0`, so the `earliestRowIndex > 0` block is dead. Delete it and the parameter; the live append-compensation is the `rightOffset < 0` logic in `TimeScale.update`. Document that in a comment.
- **Dead fields/delegates**: `InvalidateMask.#force` (only self-referential read in `merge`), `Crosshair.#subscribed` (guard that guards nothing), `TickMarks.#minIndex`/`#maxIndex`, `ChartWidget.#priceAxisWidthChanged` + `#priceAxisWidth`, `PriceScale.priceRangeChanged()`/`internalHeightChanged()` (zero subscribers; also removes `setPriceRange`'s `onlyPriceScaleUpdate` param), `PriceAxisWidget`'s unsubscribes from never-subscribed `optionsChanged()`.
- **Per-frame dead work**: `TimeAxisWidget.update()` + `#minVisibleSpan` (computed every frame, never read) — delete field, method, and the call in `ChartWidget.#drawImpl`.
- **Duplicates**: `drawScaled` in `src/gui/canvas-utils.ts` is a byte-identical dead copy of the one in `src/helpers/canvas-helpers.ts` — delete the gui copy. `drawLine` in `src/renderers/draw-line.ts` has no callers. `PaneWidget.#drawWatermark` draws nothing (renderer `_drawImpl` is empty; watermark paints via the background pass) — delete the method or consolidate to one path.
- **Dead exports/types**: run `npm run knip` and `npx knip --production`; remove the `export` keyword from in-file-only symbols (`mergePlotRows`, `mergeMinMax`, `formatterOptions`), delete unused exports/types it lists, and delete the entire re-export block in `src/api/create-chart.ts` (dead duplicate of `src/index.ts`; but see Phase 6 — the enum value exports must move to `src/index.ts`, not vanish).
- **`lastValueData` generality**: single caller uses `(undefined, false)`; remove overloads, `globalLast` branch, `plot` selector, and the always-discarded `formattedPricePercentage` computation (also `seriesLastValueMode` / `PriceAxisLastValueMode` — never set anywhere).
- The 18 `date-format.ts` formatters take an ignored `locale` param — drop the param (or implement localization; ask user if unsure — default: drop).

## Phase 4 — collapse single-implementation hierarchies

- Fold `LinePaneViewBase` → `SeriesLinePaneView` and `BarsPaneViewBase` → `SeriesCandlesticksPaneView` (each middle class has exactly one subclass).
- Delete `TimeAxisView` abstract base (sole subclass `CrosshairTimeAxisView` ignores its fields; base's `text()`/`background()`/`color()` uncalled — also drops a color-helper dependency).
- Merge `SeriesHorizontalLinePaneView` into `SeriesHorizontalBaseLinePaneView`.
- Remove never-supplied renderer-ctor injection in `PriceAxisView` and the ignored `useSecondLine` plumbing.
- Inline `SeriesData` into `Series` (pure forwarding wrapper; `Series` already bypasses it half the time). One accessor: `bars()`.
- `Series.#updateBarFunction` hardcodes `'close'`; remove the barFunction indirection and the duplicate `BarFunction` type in `series-data.ts`.

## Phase 5 — structural fixes (highest care; read CLAUDE.md perf section and `perf-summary-2.md` Deep dive A first)

1. **RAF mask ownership** (`src/gui/chart-widget.ts` `#invalidateHandler`): today `#drawPlanned` clears before `#drawImpl` and `#invalidateMask` nulls after, so every Full draw schedules one wasted no-op RAF, and an invalidation merged mid-draw after its consumption point is silently dropped. Fix while preserving the documented fold-forward behavior (a Full escalation during a Light draw must still apply in the same frame). Preferred: take ownership before drawing (`const mask = this.#invalidateMask; this.#invalidateMask = null; #drawImpl(mask)`) and have re-entrant escalations merge into the in-flight mask reference that `#drawImpl` reads — verify against the fold-forward test/scenario before and after.
2. **Layout recalc batching**: `#adjustSizeImpl` calls `model.setPaneHeight` per pane; each call runs `recalculateAllPanes()` + `lightUpdate()`. Make the layout loop set heights only, recalc once after.
3. **Double-apply of price-scale options**: `ChartModel.applyOptions` applies `priceScale` options directly AND fires `#mainPriceScaleOptionsChanged`, which re-applies them via `Pane.onPriceScaleOptionsChanged`. Keep one mechanism.
4. **Hot-path per-bar binary search**: `SeriesCandlesticksPaneView._createRawItem` calls `colorer.barStyle(time)` → `#findBar` → binary search per bar, though `_fillRawPoints` already holds the bar. Pass it via the existing `precomputedBars` param — restores the O(n) behavior CLAUDE.md describes.

## Phase 6 — API/packaging hygiene

- **package.json is broken for consumers**: `main: "index.js"` doesn't exist; `module` points at `dist/lightweight-charts.esm.production.js` but Vite emits `dist/lightweight-charts.mjs` / `.umd.js`; `typings: "dist/typings.d.ts"` is never generated. Fix the fields (add a `d.ts` build — e.g. `vite-plugin-dts` — or drop the typings claim; ask user if unsure).
- **SSR-safe import**: `src/gui/support-touch.ts` reads `window`/`navigator` at module scope — importing the bundle in Node/SSR throws (reproduced). Make detection lazy or `typeof window` guarded.
- **Export enums for real**: `src/index.ts` exports `LineStyle`/`LineType` as `export type` only, so users cannot reference the values at runtime. Export them as values (they're `const enum`s — confirm the build inlines/emits correctly; check dist exports after `npm run build`).
- **Stop mutating caller input**: `toInternalOptions` rewrites the user's `handleScale`/`handleScroll` in place; `patchPriceFormat` writes `precision` into the user's object; `fillUpDownCandlesticksColors` mutates user options. Clone before patching.
- **`merge` aliases nested source objects** when the destination key is undefined (`src/helpers/strict-type-checks.ts:16`) — deep-copy instead, or guarantee defaults cover every key. And make returned-options policy consistent: `PriceScaleApi.options()` returns the live internal object while `SeriesApi`/`TimeScaleApi` clone — clone everywhere.

## Phase 7 — docs

Update `CLAUDE.md`: it claims "no `#private` syntax" (the code uses `#` everywhere), describes `Bar['value']` as a 4-tuple (true only after Phase 3), and describes the `firstChangedPointIndex` compensation flow deleted in Phase 3. Fix all drift introduced by this cleanup, and record the final bundle-size delta.

## Explicitly do NOT

- Do not "fix" `TimePoints.merge`'s prepend path to work — delete or fence it (Phase 3) unless the user asks for history-prepend support.
- Do not fix the crosshair-pane-view `#invalidated` reset without also wiring `Crosshair.updateAllViews` (Phase 1 item 6).
- Do not introduce per-point Maps, linear scans, or allocation in draw/tick hot paths while refactoring.
- Do not change public API behavior beyond what's listed (mutation-of-input fixes are behavior changes users could observe — note them in the commit message).
