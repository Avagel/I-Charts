// sockets.ts
import { useMarketStore } from "@/stores/marketStore";

const WS_BASE = "wss://stream.binance.com:9443/ws";

/** Reconnection config */
const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 1_000; // 1 s × attempt (exponential back-off)

export interface ManagedSocket {
  /** Permanently close the socket and stop reconnect attempts */
  close: () => void;
}

/**
 * Open a Binance @trade stream for the given symbol and pipe price updates
 * into the market store.  Returns a handle whose `.close()` method you must
 * call on component unmount to avoid memory/connection leaks.
 *
 * Reconnect strategy: exponential back-off, capped at MAX_ATTEMPTS.
 */
export function createMarketSocket(symbol: string): ManagedSocket {
  const store = useMarketStore();
  let ws: WebSocket | null = null;
  let attempts = 0;
  let destroyed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (destroyed) return;

    ws = new WebSocket(`${WS_BASE}/${symbol.toLowerCase()}@trade`);

    ws.onopen = () => {
      attempts = 0; // reset back-off on successful connect
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        // Binance @trade: 's' = symbol, 'p' = price
        if (data.s && data.p) {
          store.updatePrice(data.s as string, Number(data.p));
        }
      } catch (err) {
        console.error(`[socket:${symbol}] parse error:`, err);
      }
    };

    ws.onerror = (err) => {
      console.error(`[socket:${symbol}] error:`, err);
    };

    ws.onclose = () => {
      if (destroyed) return;
      if (attempts < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempts); // exponential back-off
        attempts++;
        console.warn(`[socket:${symbol}] closed — reconnecting in ${delay}ms (attempt ${attempts})`);
        retryTimer = setTimeout(open, delay);
      } else {
        console.error(`[socket:${symbol}] max reconnect attempts reached`);
      }
    };
  };

  open();

  return {
    close() {
      destroyed = true;
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      ws?.close();
      ws = null;
    },
  };
}