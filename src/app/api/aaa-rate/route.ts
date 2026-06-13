import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

export async function GET() {
  try {
    // 10-Year US Treasury yield + ~0.5% AAA corporate spread
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yf.quote('^TNX');
    const tenYearRate: number = quote?.regularMarketPrice ?? 4.0;
    const aaaRate = parseFloat((tenYearRate + 0.5).toFixed(2));

    return NextResponse.json({
      rate: aaaRate,
      tenYearRate,
      source: '10Y Treasury + 0.5% AAA spread',
    });
  } catch {
    return NextResponse.json({
      rate: 4.5,
      source: 'Fallback rate',
    });
  }
}
