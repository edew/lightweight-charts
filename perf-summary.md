# What makes Lightweight Charts performant

A synthesis of the architectural decisions, data structures, and techniques that
give Lightweight Charts its performance, organized by layer.

## 1. Data model: columnar, immutable, binary-searched

**Fixed-shape storage.** Every data point — line, area, bar, candle, histogram —
is normalized at ingest into a single `PlotRow` whose value is a fixed 4-element
tuple `[open, high, low, close]` (`src/model/plot-data.ts`). Line/area types just
store `[v, v, v, v]`. This uniformity means one storage path, one code path, and a
tight, predictable memory layout regardless of series type.

**Sorted arrays + binary search, not maps.** `PlotList`
(`src/model/plot-list.ts`) keeps data in a read-only array sorted by
`TimePointIndex`. All time→index lookups go through generic
`lowerBound`/`upperBound` binary search (`src/helpers/algorithms.ts`, using
`count >> 1` bit-shift) for **O(log n)** access. A `MismatchDirection`
(NearestLeft/None/NearestRight) handles gaps without linear scans.

**Dual indexing in the data layer.** `DataLayer` (`src/model/data-layer.ts`)
keeps two maps — `_pointDataByTimePoint` (time → all series at that time) and
`_seriesRowsBySeries` (series → chronological rows) — that **share the same
`PlotRow` objects** rather than duplicating them ("different kind of maps to make
usages/perf better").

**Incremental updates.** `updateSeriesData` distinguishes appends
(`_updateLastSeriesRow`, the real-time hot path) from historical edits
(binary-searched). When a new time point is inserted, only points *after* the
insertion index are re-indexed, and the return value signals whether the time
scale was affected at all — letting the chart skip a full recalculation when only
one series changed.

## 2. Aggressive caching of expensive computations

| Cache | Location | What it avoids |
|---|---|---|
| **Chunked min/max** | `plot-list.ts` | Autoscale range queries split into uncached-head + cached 30-point chunks + uncached-tail; each chunk's min/max computed once. Turns O(n) into ~O(chunks). |
| **Formatted labels (LRU)** | `formatted-labels-cache.ts` | Re-running date/number formatting per frame (tick-based eviction, ~50 entries). |
| **Text width (LRU)** | `text-width-cache.ts` | Expensive canvas `measureText`; cleverly normalizes digits to `'0'` so "12:34" and "56:78" share a measurement. |
| **Gradient styles** | `gradient-style-cache.ts` | Recreating `CanvasGradient` objects; 8-param shallow compare. |
| **Color parsing** | `colors.ts` | Re-parsing color strings into RGBA (`_rgbaCache`). |
| **Time marks / price-scale marks / internal height** | `time-scale.ts`, `price-scale.ts` | Recomputing axis tick layout; invalidated only on bar-spacing/offset change. |

**Lazy visible-range computation.** The visible range is derived by formula
(`baseIndex`, `rightOffset`, `barSpacing`, `width`) and guarded by a
`_visibleRangeInvalidated` flag, so scrolling/zooming recomputes once, not per
access (`time-scale.ts:882`).

## 3. Rendering: layered canvases + tiered invalidation

**Two canvas layers per pane** (`src/gui/pane-widget.ts`): a main canvas (series,
grid, labels) and a top canvas (crosshair/cursor). Moving the mouse only repaints
the cheap top canvas — the expensive series layer is untouched.

**Four-level invalidation mask** (`src/model/invalidate-mask.ts`):
`None < Cursor < Light < Full`.
- **Cursor** → repaint top canvas only (sub-millisecond).
- **Light** → recompute price scales + redraw series.
- **Full** → rebuild GUI structure (rare: resize, pane add/remove).

**RAF batching + merge** (`chart-widget.ts`): all model changes within a frame are
merged (taking the max level) into a single `requestAnimationFrame` callback — at
most one `_drawImpl` per frame. There's also special handling to fold a Full
invalidation arriving mid-Light-update to avoid flicker.

## 4. Draw-loop micro-optimizations

- **Visible-range culling everywhere.** `indexesToCoordinates`/
  `barPricesToCoordinates` only transform items within `[visibleRange.from, to)`;
  renderers bail immediately if `visibleRange === null`. Off-screen points are
  never transformed or drawn.
- **Style batching.** `walk-line.ts`, bars, and point markers only mutate
  `ctx.fillStyle`/`strokeStyle` when the color actually changes, and flush a
  single `fill()`/`stroke()` per color run — minimizing the costly canvas state
  changes.
- **Pre-allocated coordinate scratch.** The histogram renderer pre-sizes a
  `_precalculatedCache` array (`new Array(visibleRange.count())`) and computes
  positions in one pass, even casting to skip `ensureDefined` in the loop to shave
  allocations/calls.
- **Bitmap vs media coordinate spaces** (via `fancy-canvas`): series draw in
  physical bitmap pixels (HiDPI-sharp, multiplied by `horizontalPixelRatio`/
  `verticalPixelRatio`), while text/axes use CSS-pixel media space. Bar widths are
  parity-aligned to the pixel grid for crispness without sub-pixel blur.
- **Two-tier hit testing** (`pane-hit-test.ts`): checks the handful of primitives
  first (early-out on top z-order), and only calls `hitTest` on renderers that
  implement it — most series don't, so mousemove stays cheap.

## 5. Memory & GC discipline

- **Object sharing** (data layer maps share rows; avoids cloning, with explicit
  comments about not duplicating `_sortedTimePoints`).
- **Explicit teardown:** `releaseCanvas()` shrinks canvases to 1×1 and clears
  context (an iOS Safari canvas-memory-limit workaround); `chart-model.ts
  destroy()` nulls formatter refs to break circular references.
- **CI memory-leak gate:** `@memlab` e2e tests (`tests/e2e/memleaks`) flag any
  object retaining >1MB.

## 6. Build & dependency choices

- **Essentially zero runtime deps:** the only production dependency is
  `fancy-canvas` (canvas binding + HiDPI/coordinate-space abstraction), marked
  `external` in non-standalone builds.
- **Dead-code elimination:** prod build (`tsconfig.prod.json`) strips const enums
  (`ts-transformer-strip-const-enums`), renames properties
  (`ts-transformer-properties-rename`), and drops `@internal` code
  (`stripInternal`). Terser mangles `_private_`/`_internal_` props.
- **Enforced size budgets:** `.size-limit.js` holds ~16 brotli limits — full ESM
  ≈ 47 KB, a bare `createChart` ≈ 45 KB, individual series 2.5–4 KB — so
  tree-shaking and per-series imports stay cheap.

---

**The throughline:** normalize all data into one binary-searchable sorted
structure, cache every expensive computation behind invalidation flags, and on
each frame touch only what changed — the smallest canvas layer, only the visible
bars, and only when colors/styles actually differ. The whole design optimizes for
the common case (real-time append + pan/zoom over large series) while keeping the
bundle tiny.
