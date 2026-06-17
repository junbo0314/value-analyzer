// Yahoo Finance price.exchangeName 반환값(단축코드+전체명 모두) → TradingView exchange 코드
const EXCHANGE_MAP: Record<string, string> = {
  // Short codes (price.exchange)
  NMS: 'NASDAQ',
  NGM: 'NASDAQ',
  NCM: 'NASDAQ',
  NYQ: 'NYSE',
  ASE: 'AMEX',
  PCX: 'NYSE',
  // Full names (price.exchangeName / quote.fullExchangeName)
  NasdaqGS: 'NASDAQ',
  NasdaqCM: 'NASDAQ',
  Nasdaq: 'NASDAQ',
  NYSE: 'NYSE',
  NYSEArca: 'NYSE',
  'NYSE MKT': 'AMEX',
};

export function getTradingViewSymbol(ticker: string, exchange: string): string {
  const tvExchange = EXCHANGE_MAP[exchange] ?? 'NASDAQ';
  return `${tvExchange}:${ticker}`;
}
