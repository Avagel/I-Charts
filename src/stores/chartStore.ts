import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";

const WS_BASE_URL = "wss://stream.binance.com:9443/ws";

// Candle data shape returned by both REST and WebSocket feeds
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
}

/** Maximum candles kept in memory per symbol to prevent unbounded growth */
const MAX_CANDLES = 500;

export const useChartStore = defineStore("chart", () => {
  // shallowRef: chart arrays are replaced (not mutated) — Vue only needs to
  // know that the *reference* changed, not diff every candle inside.
  const chartType = ref<Record<string, string>>({});
  const timeframe = ref<Record<string, string>>({});
  const chartData = shallowRef<Record<string, Candle[]>>({});
  const activeSockets = ref<Record<string, WebSocket>>({});

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getChartData = (symbol: string): Candle[] => chartData.value[symbol] ?? [];

  const _parseKlineMessage = (klineData: any): Candle => {
    const k = klineData.k;
    return {
      time: k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      isFinal: k.x,
    };
  };

  // ── State mutations ───────────────────────────────────────────────────────

  /**
   * Safe write path for bulk historical data.
   * Always goes through the shallowRef setter so Vue fires watchers.
   */
  const setChartData = (symbol: string, candles: Candle[]) => {
    chartData.value = { ...chartData.value, [symbol]: candles };
  };

  /**
   * Upsert a candle for the given symbol.
   * We always produce a new array reference so shallowRef watchers fire,
   * but we avoid copying the whole dataset on every tick by mutating
   * in place for in-progress candles and only spreading when appending.
   */
  const updateKlineData = (symbol: string, klineData: any) => {
    const candle = _parseKlineMessage(klineData);
    const current = chartData.value[symbol] ?? [];
    let next: Candle[];

    const last = current[current.length - 1];
    if (!last) return;
    if (!current.length || last.time !== candle.time) {
      // New candle — append and trim to cap
      next = current.length >= MAX_CANDLES ? [...current.slice(1), candle] : [...current, candle];
    } else {
      // In-progress candle — replace last entry only
      next = [...current];
      next[next.length - 1] = candle;
    }

    chartData.value = { ...chartData.value, [symbol]: next };
  };

  // ── WebSocket helpers ─────────────────────────────────────────────────────

  const _openSocket = (
    symbol: string,
    interval: string,
    onMessage: (data: any) => void,
  ): WebSocket => {
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const socket = new WebSocket(`${WS_BASE_URL}/${streamName}`);

    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch (err) {
        console.error(`[chartStore] parse error for ${symbol}:`, err);
      }
    };

    socket.onerror = (err) => {
      console.error(`[chartStore] WebSocket error for ${symbol}:`, err);
    };

    return socket;
  };

  const unsubscribeKlines = (symbol: string) => {
    const sock = activeSockets.value[symbol];
    if (sock) {
      sock.close();
      const next = { ...activeSockets.value };
      delete next[symbol];
      activeSockets.value = next;
    }
  };

  const setupWebSocketSubscription = (symbol: string) => {
    unsubscribeKlines(symbol);

    const interval = timeframe.value[symbol] ?? "1m";
    const socket = _openSocket(symbol, interval, (data) => {
      updateKlineData(symbol, data);
    });

    activeSockets.value = { ...activeSockets.value, [symbol]: socket };
  };

  // ── Public API ────────────────────────────────────────────────────────────

  const setTimeframe = (symbol: string, newTimeframe: string) => {
    if (timeframe.value[symbol] === newTimeframe) return;
    timeframe.value = { ...timeframe.value, [symbol]: newTimeframe };

    // Only reconnect if we already have an active socket
    if (activeSockets.value[symbol]) {
      setupWebSocketSubscription(symbol);
    }
  };

  const setChartType = (symbol: string, type: string) => {
    chartType.value = { ...chartType.value, [symbol]: type };
  };

  /** Call once per symbol when the corresponding view mounts */
  const initializeSymbol = (symbol: string) => {
    if (symbol in activeSockets.value) return; // already streaming
    setupWebSocketSubscription(symbol);
  };

  /** Close every open socket — call from app root onUnmounted */
  const cleanupAllSockets = () => {
    Object.keys(activeSockets.value).forEach(unsubscribeKlines);
  };

  return {
    chartType,
    timeframe,
    chartData,
    getChartData,
    setChartData,
    setTimeframe,
    setChartType,
    initializeSymbol,
    cleanupAllSockets,
    unsubscribeKlines,
    updateKlineData,
    setupWebSocketSubscription,
  };
});
