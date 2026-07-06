# High-frequency realtime streaming: the hot path & jank elimination

A companion to `perf-summary.md`, focused specifically on what happens when you
stream high-frequency data via `series.update(bar)` and pan/zoom over it — the
realtime path and the techniques that keep it jank-free. Findings are grounded in
the source (file:line references) and include two deep dives requested during
review: the mid-draw invalidation fold, and the `_fillRawPoints` allocation
behaviour.

---

## The throughline

The realtime design is built around one idea: **a tick should touch O(1) data,
schedule at most one paint, and recompute/redraw only what genuinely changed.**
Most of the cleverness is in aggressively detecting "nothing structural changed"
and short-circuiting.

Honest caveat: it is *not* a fully incremental render pipeline. Every tick still
calls `model.recalculateAllPanes()` (`src/api/chart-api.ts:386`). The performance
doesn't come from skipping that traversal — it comes from making it cheap (skip
the time-scale rebuild, lazy cached autoscale, cull to visible range).

---

## 1. Cheap ingest — O(1) append, never re-sort

The data layer separates the real-time path from `setData`'s full rebuild
(`src/model/data-layer.ts:246`, `updateSeriesData`).

- **In-place tick (same timestamp as last bar):** `_updateLastSeriesRow`
  overwrites the final array element (`data-layer.ts:338`) — O(1), no allocation.
- **New bar (append right):** push to the end (`data-layer.ts:334`), then a
  binary-search insert into `_sortedTimePoints` (`lowerBound`, `data-layer.ts:307`).
  The re-index loop after the insert (`:314`) runs from `insertIndex` to the end —
  for a rightmost append that's effectively O(1).
- **Sorted invariant kept for free:** out-of-order *older* updates throw
  (`data-layer.ts:256`), so the array never needs re-sorting on the hot path.
  Contrast `setData`, which does a full O(n log n) sort (`:230`).

## 2. Skip the time-scale rebuild — the key short-circuit

`affectsTimeScale = pointDataAtTime === undefined` (`data-layer.ts:269`). If the
timestamp already exists (an in-place update of the current candle — the most
common streaming case), it returns `_getUpdateResponse(series, -1, ...)` with
`firstChangedPointIndex = -1` (`:296`). Downstream, `model.updateTimeScale(...)`
then does no point work — no tick-mark relayout, no time-axis rebuild. The whole
time-scale subsystem is bypassed.

## 3. One frame, one paint — RAF batching + invalidation merge

Many ticks can arrive between frames (a burst of WebSocket messages). They're
coalesced (`src/gui/chart-widget.ts:684`, `_invalidateHandler`):

- A `_drawPlanned` flag guarantees **at most one `requestAnimationFrame` → one
  `_drawImpl` per frame**, regardless of how many updates landed.
- Pending invalidations are *merged* by taking the **max level** and OR-ing
  autoscale flags (`src/model/invalidate-mask.ts:15`), so 50 updates collapse into
  one unit of work.

## 4. Tiered invalidation — repaint only the layer that changed

Two stacked canvases per pane: main (series/grid, z-index 1) and top
(crosshair/cursor, z-index 2) (`src/gui/pane-widget.ts:115`). The four-level mask
`None < Cursor < Light < Full` (`src/model/invalidate-mask.ts:3`) gates how much
repaints:

- **Cursor** (mouse move) → clears and repaints *only the top canvas*; the
  expensive series layer is untouched (main-canvas block guarded by
  `type !== Cursor` in `pane-widget.ts paint()`).
- **Light** (the realtime tick) → repaint series + grid, recompute price scales;
  no GUI/layout rebuild.
- **Full** (resize, add/remove pane) → rebuild structure. Rare.

## 5. Lazy + cached recompute — making the unavoidable recalc cheap

This is what keeps `recalculateAllPanes` from being a problem:

- **Autoscale is lazy and flag-guarded:** the price range recomputes once per
  invalidation via `_makeSureItIsValid()` / `_invalidatedForRange.isValid`
  (`src/model/price-scale.ts:910`), not per coordinate lookup.
- **Chunked min/max:** autoscale's range query is split into uncached-head +
  cached 30-bar chunks + uncached-tail (`src/model/plot-list.ts`), so each tick
  only re-scans the edges, not the whole series.
- **Per-frame caches that survive streaming:** formatted-label LRU, text-width LRU
  (with the trick of normalizing digits `2-9 → 0` so `"12:34"`/`"56:78"` share a
  measurement), gradient-object cache, RGBA color cache, time/price tick-mark
  caches. None re-run while colors/zoom hold steady.
- `series.setData` recalculates only the **source pane** (`src/model/series.ts:255`),
  though `_sendUpdateToChart` then still does the global pass.

## 6. Draw only what's on screen — visible-range culling

Every renderer first binary-searches the visible window (`visibleTimedValues` →
`lowerBound`/`upperBound`, `src/model/time-data.ts`) and bails immediately if it's
null. Coordinate mapping and the draw loops iterate only `[from, to)`. Streaming
into a 100k-point series while showing 200 bars means ~200 points are
transformed/drawn — the other 99.8k are never touched.

## 7. Cheap inner loops — minimize canvas state changes

- **Style batching:** color only written to `ctx.fillStyle`/`strokeStyle` when it
  actually changes, with one `fill()`/`stroke()` per color run
  (`src/renderers/walk-line.ts`, `candlesticks-renderer.ts`, point markers) —
  turns N state changes into ~(#color runs).
- **Pre-allocated scratch:** the histogram sizes its coordinate cache to exactly
  `visibleRange.count()` and precomputes pixel positions once, leaving a bare
  `fillRect` loop (`src/renderers/histogram-renderer.ts`).
- **Pixel-grid alignment:** bitmap vs media coordinate spaces (fancy-canvas) and
  0.5px correction for odd line widths (`src/renderers/draw-line.ts`) keep lines
  crisp on HiDPI without sub-pixel blur.
- **Cheap hit-testing:** two-tier with early-out, and most series don't implement
  `hitTest` at all (`src/model/pane-hit-test.ts`), so mouse-over-live-data stays
  smooth.

## 8. Realtime-specific niceties

- **Last-price animation** (`src/views/pane/series-last-price-animation-pane-view.ts`)
  is driven by `performance.now()` and self-re-queues through time-scale
  invalidations; `onNewRealtimeDataReceived()` (`:114`) extends/restarts the pulse
  on each tick without forcing extra full redraws.
- **Animations re-schedule their own next RAF** from inside the draw callback
  (`chart-widget.ts:702`), so smooth motion doesn't depend on data continuing to
  arrive.

---

## Deep dive A — the mid-draw "Full invalidation" fold

> *"How is a Full invalidation arriving mid-Light draw handled — aren't
> invalidations synchronous and serial?"*

They **are** synchronous and serial, and that's exactly why the fold works the way
it does. Invalidations never draw — they buffer into a field and schedule one RAF.

1. `_invalidateHandler` (`chart-widget.ts:684`) merges the incoming mask into
   `this._invalidateMask` and schedules a single RAF, guarded by `_drawPlanned`.
   It does no drawing.
2. When the RAF fires (`:693`) it does a **swap**: `_drawPlanned = false`, captures
   `this._invalidateMask` into a **local** `mask`, sets the field
   `this._invalidateMask = null`, *then* calls `_drawImpl(mask, time)`. The frame
   now works off a private copy; the field is empty.
3. Inside `_drawImpl`, the Light branch runs `_applyMomentaryAutoScale` and
   `_applyTimeScaleInvalidations`, then `_timeAxisWidget.update()` /
   `pane.updatePriceAxisWidgets()` (`:615`–`621`). Any of these can
   **synchronously mutate the model** — e.g. autoscale widens the price range → the
   price-axis label gets wider → the price-scale width changes → the time-scale's
   available width changes.
4. That mutation calls `_invalidateHandler` **re-entrantly, on the same stack**.
   Because the field is currently `null`, it installs a fresh mask there; because
   `_drawPlanned` is `false` (reset in step 2), it *also* queues a new RAF for the
   next frame.

So the "mid-draw Full invalidation" isn't an async arrival — it's a re-entrant one
the draw caused itself. The swap in step 2 is what makes it detectable: anything
now sitting in `this._invalidateMask` was generated *during* this frame, distinct
from the `mask` local being drawn.

The fold (`chart-widget.ts:627`) is the special case: *if that re-entrant
invalidation escalated to `Full`* (the price-scale-width-changes-timescale-width
case the code comment calls out), it merges, redoes `_updateGui()` + autoscale +
timescale invalidations **now**, adopts the field as the mask to paint, and nulls
the field (`:628`–`636`). Then a single `paint()` (`:640`) draws the corrected
geometry — the stale-width Light frame is never painted, so no flicker.

The next-frame RAF queued back in step 4 still fires, but finds
`this._invalidateMask === null` (`:697`) and does nothing — a harmless no-op.

Net: invalidations stay serial; re-entrancy during a draw is normal and lands one
frame later by default; the fold just pulls a **Full escalation** *forward* into
the current frame. It is scoped to `Full` only — a re-entrant *Light* is left for
the next frame.

---

## Deep dive B — `_fillRawPoints` and allocation

> *"There's some allocation-minimising reasoning around `_fillRawPoints` — it not
> running on the hot path. Am I misremembering?"*

Correct, with one sharpening. `_fillRawPoints` is the expensive allocator:

```ts
// src/model/series/line-pane-view-base.ts:42
//   (bars-pane-view-base.ts:45 is the same shape)
this._items = this._series.bars().rows().map((row) => this._createRawItem(row.index, value, colorer));
```

It rebuilds the **entire** `_items` array — one fresh object per row across the
*whole* series (not just visible), each with `x/y` (or `openY/highY/...`)
initialized to `NaN`. It is gated behind `_dataInvalidated` in a three-tier flag
system (`src/model/series/series-pane-view-base.ts`):

| flag | set by | work in `_makeValid()` | allocates? |
|---|---|---|---|
| `_dataInvalidated` | `update('data')` | `_fillRawPoints()` | **yes** — full `_items` realloc |
| `_optionsInvalidated` | `update('options')` | `_updateOptions()` (re-map colors) | yes, on options change |
| `_invalidated` | every `update()` | `_makeValidImpl()` — visible range + `_convertToCoordinates` | **no** — writes x/y *in place* |

The decisive detail: `series.updateAllViews()` (`src/model/series.ts:439`) calls
`this._paneView.update()` with **no argument**. That's the path fired by every
generic recalc — **pan, zoom, scroll, autoscale, time-scale animation** (via
`pane.updateAllSources()` → `source.updateAllViews()`, `src/model/pane.ts:289`).
So those frames set only `_invalidated`, skip `_fillRawPoints`, and run just
`_makeValidImpl` → `_convertToCoordinates` (`line-pane-view-base.ts:26`), which
mutates `x`/`y` on the *existing* item objects. **The highest-frequency
interaction — dragging/zooming — reallocates nothing for the series points.** That
is the allocation-minimising reasoning.

The sharpening: only `series.setData` calls `_paneView.update('data')`
(`src/model/series.ts:244`), and `series.update(bar)` flows through exactly that.
So on the realtime **data** hot path, `_dataInvalidated` *is* set and
`_fillRawPoints` **does** run every tick — rebuilding the whole `_items` array
(O(n) in series length, allocating n objects), even though the data layer only
touched one row.

So `_fillRawPoints` is deliberately kept off the *pan/zoom/cursor* hot path, but it
is squarely *on* the streaming-ingest hot path, where it re-materializes the entire
point array per tick.

---

## Open questions / candidates to profile

These are the few places the realtime path is **not** truly incremental — worth
profiling when streaming into a very long series:

1. **`recalculateAllPanes()` is always called per tick** (`chart-api.ts:386`),
   even when `firstChangedPointIndex === -1`. Could it be narrowed to
   `recalculatePane` for the one affected pane, or elided entirely on a pure
   in-place tick?
2. **`_fillRawPoints` reallocates the whole `_items` array per data tick**
   (Deep dive B). For high-frequency streaming over a long series this O(n)
   allocation-per-tick is plausibly the dominant cost — more than anything in the
   data layer. A reusable/append-in-place items buffer mirroring the data layer's
   O(1) append would remove it.
