# I-Charts

> A production-grade real-time cryptocurrency analytics dashboard built with Vue 3, TypeScript, and ECharts — powered by live Binance WebSocket streams.

---

## Overview

I Charts is a high-performance real-time data visualization platform that streams live cryptocurrency market data directly from Binance and renders it with smooth, interactive charts and an always-updating activity feed. It is built to feel like a professional trading terminal — responsive across every screen size, resilient to network failures, and optimized to handle hundreds of WebSocket frames per second without dropping frames or leaking memory.

---

## Features

### Real-Time Data Streaming

- Live price updates via Binance `@trade` WebSocket streams — one socket per symbol
- Live candlestick formation via Binance `@kline_*` streams — candle body and wicks update every ~250ms as price moves within the interval
- Automatic reconnection with **exponential back-off** (`1s × 2ⁿ`, capped at 6 attempts) on both market and chart sockets
- Activity feed connects to a multiplexed Binance WebSocket and subscribes to multiple trade and kline streams simultaneously

### Live Charts

- **Line** — clean price line with no fill
- **Area** — gradient-filled area chart
- **Bar** — per-candle close price bars with rounded tops
- **Candlestick** — full OHLC candlestick with live-forming candle, green/red body colouring, and a scrub bar for zooming into history
- All charts support **mouse-wheel zoom** and **pan** via ECharts `dataZoom`
- Default view is pinned to the last 60 candles so the live-forming candle is always large and visible at the right edge

### Interactive Controls (via Chart Modal)

- Switch between **Line / Area / Bar / Candlestick** chart types on the fly
- Change **timeframe**: 1m, 5m, 15m, 1h, 4h, 1D, 1W
- Tooltip on hover shows OHLCV data for candlestick, close price for all others
- Keyboard **Escape** closes the modal; clicking the backdrop also closes it

### Dashboard Panels

- **Market Today** — top 8 symbols as coin rows with avatar, price, volume, and 24h change; filterable by All / Gainers / Losers
- **Market Metrics** — remaining symbols as metric cards, each with a live mini-chart; displayed as a horizontal carousel on mobile, grid on larger screens
- **Activity Feed** — live trade and kline-close events with type icons, severity colours, relative timestamps, unread badges, and per-type filtering

### Activity Feed

- **Paused by default** — stream is always received but events queue silently until you resume, preventing an overwhelming flood on load
- **Resume** flushes the entire queue in one batch
- Queued event count shown live in the Resume button badge (capped display at "99+")
- In-feed sticky banner shows queue size while paused
- Filter by event type: All, Trades, Alerts, Transactions, Metrics
- Mark events as read on click
- Scroll-to-bottom FAB appears when new events arrive off-screen
- Smooth slide-in / slide-out animations via Vue `TransitionGroup`
- Custom styled scrollbar

### Dark / Light Mode

- Defaults to **dark** theme
- Follows **OS preference** automatically (`prefers-color-scheme`)
- Manual toggle in the nav bar persists to `localStorage` and survives page reloads
- Smooth `0.2s` transition between themes
- Sun / Moon icon in the nav reflects the current mode

### Responsive Layout

| Breakpoint    | Layout                                                         |
| ------------- | -------------------------------------------------------------- |
| Mobile `< md` | Single column stack                                            |
| Tablet `md`   | 2 columns: coin list + metrics / activity feed                 |
| Desktop `lg+` | 3 columns: coin list / metrics / activity feed                 |
| XL            | Metric card grid expands to 2 columns inside the metrics panel |

---

## Tech Stack

| Concern   | Library                              |
| --------- | ------------------------------------ |
| Framework | Vue 3 (Composition API)              |
| Language  | TypeScript                           |
| Styling   | Tailwind CSS v4                      |
| Charts    | Apache ECharts + `vue-echarts`       |
| State     | Pinia                                |
| Icons     | `lucide-vue-next`                    |
| Data      | Binance REST API + WebSocket Streams |

---

## Architecture

```
src/
├── api/
│   ├── binance.ts       # REST: fetchTicker, fetchCurrencies
│   ├── charts.ts        # REST: fetchKlines (historical OHLCV)
│   └── sockets.ts       # WS: createMarketSocket (ManagedSocket with reconnect)
├── composables/
│   └── useTheme.ts      # Singleton dark/light theme state + localStorage persistence
├── stores/
│   ├── marketStore.ts   # Live prices; RAF-batched updates; shallowRef for performance
│   └── chartStore.ts    # Kline data per symbol; WS subscriptions; setChartData action
├── components/
│   ├── LiveChart.vue    # ECharts wrapper; loads history + subscribes WS on mount
│   ├── MetricCard.vue   # Mini chart card; emits "open" event for modal
│   ├── CoinRow.vue      # Single coin row; emits "open" event for modal
│   ├── Modal.vue        # Full-screen chart detail with chart type + timeframe controls
│   └── ActivityFeed.vue # Live event feed with pause/resume, filtering, animations
├── views/
│   └── HomeView.vue     # Root layout: nav bar, 3-column grid, modal state owner
└── assets/
    └── style.css        # Tailwind v4 @theme tokens; dark + light variable overrides
```

### State Management

Two Pinia stores handle all reactive data:

**`marketStore`**
Holds a `shallowRef<Record<string, MarketTicker>>` — shallow because Vue only needs to know when the top-level reference changes, not diff every nested price field. Price updates from WebSocket frames are **buffered in a `Map` and flushed once per animation frame** via `requestAnimationFrame`, collapsing hundreds of frames/sec into ~60 re-renders/sec.

**`chartStore`**
Holds kline arrays per symbol in a `shallowRef<Record<string, Candle[]>>`. All writes go through `setChartData(symbol, candles)` or `updateKlineData(symbol, frame)` — both replace the top-level reference so Vue's shallow watcher fires correctly. In-progress candles are updated in place (replace last array entry) rather than appended, so the forming candle animates smoothly. A `MAX_CANDLES = 500` cap prevents unbounded memory growth.

### Data Streaming Approach

```
Binance REST (fetchKlines)
  └─ 100 historical candles → chartStore.setChartData()
       └─ LiveChart renders immediately

Binance WS (@kline_1m stream)
  └─ ~250ms frames → chartStore.updateKlineData()
       └─ isFinal=false → replace last candle (forming)
       └─ isFinal=true  → append new candle
            └─ ECharts notMerge:true repaints
```

Market price sockets (`@trade`) feed `marketStore.updatePrice()` which is RAF-batched. Chart sockets (`@kline_*`) feed `chartStore.updateKlineData()` which fires synchronously — chart data must update every frame for the forming candle to be visible.

### Rendering Optimization

- `shallowRef` on all large data structures — Vue never deep-diffs arrays of 500 candles
- `requestAnimationFrame` batching on price updates — 500 trades/sec collapses to 60 re-renders/sec
- `animation: false` on ECharts — disables entry/exit animation for streaming data
- `notMerge: true` on chart updates — ensures switching chart types does a clean series replace instead of merging incompatible series configs
- `lazyUpdate: true` — ECharts batches DOM repaints within the same event loop tick
- `dataZoom` with a fixed 60-candle window — chart never needs to lay out all 500 candles
- Activity feed capped at 200 visible + 200 queued events, trimmed via `slice` (O(1) ref swap, not splice)
- `TransitionGroup` leave animation uses `forwards` fill so removed events don't snap out

### Trade-offs

| Decision                                     | Trade-off                                                                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One WebSocket per symbol for market prices   | Simple and reliable; opens many connections with a large symbol list. A combined stream (`/stream?streams=...`) would be more efficient at scale                                                       |
| `shallowRef` instead of `ref` for chart data | Cheaper reactive tracking but requires explicit reference replacement on every write — easy to accidentally bypass with direct mutation                                                                |
| RAF batching for price updates               | Smooths rendering at high message rates but introduces up to ~16ms display lag per price tick                                                                                                          |
| `notMerge: true` on every chart update       | Guarantees correct chart type switching but causes ECharts to rebuild the full series on every candle tick. For very high-frequency data, `notMerge: false` with careful series naming would be faster |
| Activity feed paused by default              | Prevents overwhelming the user on load; means the feed appears empty until manually resumed                                                                                                            |

---

## Setup

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install

```bash
git clone https://github.com/your-username/cryptostream.git
cd cryptostream
npm install
```

### Run (development)

```bash
npm run dev
```

### Build

```bash
npm run build
```

No API keys are required. All data comes from Binance's public REST and WebSocket APIs.

---

## Usage

1. The dashboard loads and fetches the top 16 USDT trading pairs from Binance.
2. Each symbol opens a `@trade` WebSocket for live price updates.
3. Click any **Coin Row** or **Metric Card** to open the chart modal.
4. In the modal, use the **chart type tabs** (Line / Area / Bar / Candle) and **timeframe tabs** (1m–1W) to explore the data.
5. The **Activity Feed** is paused on load — click **Resume** to start the live stream.
6. Use the **Sun / Moon** button in the top-right nav to toggle dark and light mode.

---

## License

MIT
