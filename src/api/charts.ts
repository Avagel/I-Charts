const BASE_URL = "https://api.binance.com";

// ── Types ─────────────────────────────────────────────────────────────────

/** Raw kline array returned by Binance REST API */
export type RawKline = [
  number,  // 0 Open time
  string,  // 1 Open
  string,  // 2 High
  string,  // 3 Low
  string,  // 4 Close
  string,  // 5 Volume
  number,  // 6 Close time
  string,  // 7 Quote asset volume
  number,  // 8 Number of trades
  string,  // 9 Taker buy base asset volume
  string,  // 10 Taker buy quote asset volume
  string,  // 11 Ignore
];

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch historical klines (candlestick data) for `symbol` at the given
 * `interval`.  Returns up to `limit` candles (Binance max is 1 000).
 *
 * Throws on network or API errors.
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit = 100,
): Promise<RawKline[]> {
  const url =
    `${BASE_URL}/api/v3/klines` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${encodeURIComponent(interval)}` +
    `&limit=${limit}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `fetchKlines failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<RawKline[]>;
}