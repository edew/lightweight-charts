# Status and open items

`CLAUDE.md` describes the architecture and the rules. This file has the measured numbers, the items that are still open, and design notes for work that is not started.

## Numbers

Measured on 2026-11-19.

| Metric | Value | Limit |
|---|---|---|
| Bundle, UMD minified (`npm run build`) | 58.72 kB | 60 kB |
| Bundle, UMD gzip | 19.90 kB | 20 kB |
| Bundle, ES module gzip | 22.33 kB | |
| Runtime dependencies | 0 | 0 |
| `src` lines | 6,844 | |
| Canvas elements for one chart | 2 | 2 |
| Unit and pixel tests | 280 | |

The margin below the gzip limit is small. Run `npm run build` after each change in `src` and read the gzip size of the UMD file.

### Benchmark (`npm run bench`)

Candlestick series, one-minute bars, 200 visible bars, device pixel ratio 2. The canvas context in the benchmark does nothing, thus the times are the cost of the library code and not of the rasterizer.

| Bars | `setData` ms | Retained B/bar | Tick µs | Tick + draw µs | Append µs | Append + draw µs | Pan frame µs |
|---|---|---|---|---|---|---|---|
| 10,000 | 3.7 | 71 | 1.3 | 26 | 1.5 | 20 | 11 |
| 100,000 | 4.2 | 33 | 0.3 | 6 | 0.5 | 10 | 7 |
| 1,000,000 | 31.7 | 34 | 0.2 | 5 | 0.2 | 11 | 8 |

All costs are constant in the number of bars, but not `setData`. Limits: `setData` for 100,000 bars below 10 ms, retained memory below 50 B for each bar, append below 2 µs.

## Open items

1. **Touch input.** Long tap, tracking mode and pinch use Pointer Events. They were checked only with a mouse and with pointer events of the type `touch` from a script. Test on a touch device.
2. **Level of detail.** `TimeScale` does not permit a bar spacing below 0.5 CSS pixels, thus there are at most two bars for each CSS pixel and the draw cost is limited by the canvas width. Level of detail is necessary only if that limit is removed. Then: aggregate for each pixel column (minimum and maximum; first and last for candles) into a scratch buffer that is allocated one time, and draw from that buffer.
3. **Tick marks on zoom.** A change of the minimum distance between marks builds all marks again (approximately 2 ms for 100,000 time points, 18 ms for 1,000,000). A rule that does not depend on the first time point would make this constant, but it changes which labels are shown.
4. **Draw order of series.** The series that was added last is below the other series. Decide if it must be the opposite. It is one loop direction in `drawPane()`.
5. **Pane API.** `chart.panes()` returns `IPaneApi` with `height()`, `stretchFactor()`, `setStretchFactor()`, `applyPriceScaleOptions()` and `priceScaleOptions()`. The user did not confirm this shape.
6. **`touch-action`.** One element has one CSS `touch-action`, thus the page scroll setting of the pane (`handleScroll.vertTouchDrag` / `horzTouchDrag`) also applies on the axes.
7. **History prepend.** An update with a time that is older than the last bar of the series throws. Data before the first bar can be added only with `setData`.
8. **`website/`, `lib/`.** These directories are old build output that git ignores. They can be deleted from the disk. `npx vitest run` with no path finds the old files in `lib/`; use `npm test`.

## Design notes: more series types

The types in this table are not implemented. The table shows how each one fits the `SeriesKind` record.

| Type | Stride | Draw | Range |
|---|---|---|---|
| Line | 1 | one path, one `stroke()` | column 0 |
| Area | 1 | line path, then close to the bottom and `fill()` | column 0 |
| Baseline | 1 | line path two times, each with a clip rectangle above or below the base price | column 0 |
| Histogram | 1 | one `fillRect` for each bar | column 0 and the base |
| Candlestick | 4 | wicks, borders, bodies | columns 1 and 2 |
| HLC / OHLC bars | 4 | three thin rectangles for each bar | columns 1 and 2 |

- A color for each bar is an optional `Uint32Array` column on the series. Do not add it to the stride.
- A histogram needs the maximum or the sum for level of detail, not the minimum and maximum pair.
- Price lines, markers and hit tests are shared passes over the store. Do not put them in `SeriesKind`.
- The candle draw code does three passes (all wicks, all borders, all bodies) and writes `fillStyle` when the color changes from bar to bar. One pass for up bars and one for down bars would change pixels where bars overlap at a small bar spacing.

## Do not

- Do not keep the data objects of the caller after ingest.
- Do not add a base class for series kinds. Share code through plain functions.
- Do not make one canvas for each pane. Panes are rectangles in the two canvases.
- Do not import a series kind from the chart core. That stops tree-shaking.
- Do not add Playwright, Puppeteer, jsdom or Vitest browser mode for tests.
- Do not move drawing to WebGL, WebGPU, a worker or `OffscreenCanvas` before a measurement in a browser shows that the rasterizer is the limit.
