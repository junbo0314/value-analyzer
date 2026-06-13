import { NextRequest, NextResponse } from 'next/server';
import { resolveKoreanTicker } from '@/lib/koreanTickers';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YF = require('yahoo-finance2').default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new YF({ suppressNotices: ['yahooSurvey'] });

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json([]);

  // 1. 한글/별칭 매핑으로 즉시 해결
  const resolved = resolveKoreanTicker(q);
  if (resolved) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yf.quote(resolved);
      return NextResponse.json([{
        symbol: resolved,
        name: quote.longName ?? quote.shortName ?? resolved,
        exchange: quote.fullExchangeName ?? '',
        type: 'EQUITY',
      }] satisfies SearchResult[]);
    } catch {
      // fall through to search
    }
  }

  // 2. Yahoo Finance search (영문 입력에 잘 동작)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.search(q, { newsCount: 0 });
    const quotes: SearchResult[] = (result.quotes ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.quoteType === 'EQUITY' && r.symbol)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .slice(0, 7)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({
        symbol: r.symbol,
        name: r.shortname ?? r.longname ?? r.symbol,
        exchange: r.exchDisp ?? r.exchange ?? '',
        type: r.quoteType,
      }));
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json([]);
  }
}
