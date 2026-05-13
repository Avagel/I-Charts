export type Direction = 'pos' | 'neg'

export interface Coin {
  ticker: string
  name: string
  symbol: string
  price: string
  abs: string
  pct: string
  dir: Direction
  sparkPoints: string   // SVG polyline points
  iconClass: string
  iconChar: string
  high: string
  low: string
}

export interface OrderBookEntry {
  bid: string
  bidVol: string
  askVol: string
  ask: string
  fillPct: number
}

export interface Metric {
  label: string
  value: string
  change: string
  positive: boolean
}
