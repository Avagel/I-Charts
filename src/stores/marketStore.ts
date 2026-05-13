import type { MarketTicker } from "@/types/market";
import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";

export const useMarketStore = defineStore("market", () => {
  // shallowRef avoids deep reactivity on the entire record — only top-level
  // reassignment triggers updates, which we control manually via triggerRef.
  const markets = shallowRef<Record<string, MarketTicker>>({});

  /** Batch of pending price updates, flushed on the next animation frame */
  const pendingUpdates = new Map<string, number>();
  let rafId: number | null = null;

  const flushUpdates = () => {
    rafId = null;
    if (!pendingUpdates.size) return;

    // Clone only once per frame, apply all pending updates
    const next = { ...markets.value };
    pendingUpdates.forEach((price, symbol) => {
      if (next[symbol]) next[symbol] = { ...next[symbol], price };
    });
    pendingUpdates.clear();
    markets.value = next; // single reactive write per frame
  };

  const setInitialMarket = (ticker: any) => {
    markets.value = {
      ...markets.value,
      [ticker.symbol]: {
        symbol: ticker.symbol,
        price: Number(ticker.lastPrice),
        change: Number(ticker.priceChangePercent),
        volume: Number(ticker.volume),
      },
    };
  };

  /**
   * Buffer price updates and flush them together on the next animation frame.
   * This prevents per-trade re-renders (Binance sends hundreds of trades/sec).
   */
  const updatePrice = (symbol: string, price: number) => {
    if (!(symbol in markets.value)) return;

    pendingUpdates.set(symbol, price);

    if (rafId === null) {
      rafId = requestAnimationFrame(flushUpdates);
    }
  };

  /** Call this when the application unmounts to cancel any pending RAF. */
  const dispose = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingUpdates.clear();
  };

  return { markets, setInitialMarket, updatePrice, dispose };
});