import type { Coin, OrderBookEntry } from '@/types'

export const coins: Coin[] = [
  {
    ticker: 'BTC', name: 'Bitcoin', symbol: '₿',
    price: '$32,811.00', abs: '-761.1', pct: '-2.27%', dir: 'neg',
    iconClass: 'coin-btc', iconChar: '₿',
    high: '$33,600.00', low: '$31,900.00',
    sparkPoints: '0,8 8,10 16,7 24,14 32,18 40,22 48,20 56,25 64,28',
  },
  {
    ticker: 'ETH', name: 'Ethereum', symbol: 'Ξ',
    price: '$2,489.10', abs: '+102.2', pct: '+3.95%', dir: 'pos',
    iconClass: 'coin-eth', iconChar: 'Ξ',
    high: '$2,489.10', low: '$2,191.26',
    sparkPoints: '0,26 8,22 16,24 24,18 32,14 40,16 48,10 56,7 64,4',
  },
  {
    ticker: 'USDT', name: 'Tether', symbol: '₮',
    price: '$1.00', abs: '-0.1', pct: '-0.1%', dir: 'neg',
    iconClass: 'coin-usdt', iconChar: '₮',
    high: '$1.002', low: '$0.998',
    sparkPoints: '0,15 8,14 16,16 24,15 32,17 40,14 48,16 56,15 64,17',
  },
  {
    ticker: 'SOL', name: 'Solana', symbol: '◎',
    price: '$178.55', abs: '+4.20', pct: '+2.41%', dir: 'pos',
    iconClass: 'coin-sol', iconChar: '◎',
    high: '$181.20', low: '$172.40',
    sparkPoints: '0,22 8,20 16,23 24,17 32,13 40,15 48,9 56,6 64,3',
  },
]

export const orderBook: OrderBookEntry[] = [
  { bid: '$2,490', bidVol: '493,128,201', askVol: '881,828,501',   ask: '$2,495', fillPct: 72 },
  { bid: '$2,480', bidVol: '853,177,018', askVol: '1,620,091,122', ask: '$2,500', fillPct: 58 },
  { bid: '$2,450', bidVol: '2,559,631,054', askVol: '5,821,501,904', ask: '$2,505', fillPct: 40 },
]
