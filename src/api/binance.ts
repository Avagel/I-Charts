const BASE_URL = "https://api.binance.com";

// ── Types ─────────────────────────────────────────────────────────────────

export interface RawTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  [key: string]: unknown;
}

export interface RawSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  [key: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Thin fetch wrapper that throws a typed Error on non-2xx responses,
 * avoiding silent failures from unchecked `response.ok`.
 */
async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(
      `Binance API error: ${response.status} ${response.statusText} — ${path}`,
    );
  }

  return response.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch 24-hour ticker statistics for a single symbol.
 * Throws on network or API errors — callers should handle accordingly.
 */
export async function fetchTicker(symbol: string): Promise<RawTicker> {
  return apiFetch<RawTicker>(`/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`);
}

/**
 * Fetch exchange info and return the first `limit` trading symbols.
 * Only TRADING symbols with USDT as quote asset are returned to reduce noise.
 *
 * @param limit  How many symbols to return (default 16)
 */
export async function fetchCurrencies(limit = 16): Promise<RawSymbol[]> {
  const result = await apiFetch<{ symbols: RawSymbol[] }>("/api/v3/exchangeInfo");

  return result.symbols
    .filter((s) => s.status === "TRADING" && s.quoteAsset === "USDT")
    .slice(0, limit);
}