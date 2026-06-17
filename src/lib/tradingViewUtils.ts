const EXCHANGE_MAP: Record<string, string> = {
  NMS: 'NASDAQ',  // NASDAQ Global Select
  NGM: 'NASDAQ',  // NASDAQ Global Market
  NCM: 'NASDAQ',  // NASDAQ Capital Market
  NYQ: 'NYSE',
  ASE: 'AMEX',
  PCX: 'NYSE',
};

export function getTradingViewSymbol(ticker: string, exchange: string): string {
  const tvExchange = EXCHANGE_MAP[exchange] ?? 'NASDAQ';
  return `${tvExchange}:${ticker}`;
}
