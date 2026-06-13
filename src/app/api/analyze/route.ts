import { NextRequest, NextResponse } from 'next/server';
import { StockData } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: '티커를 입력해주세요.' }, { status: 400 });
  }

  const sym = decodeURIComponent(ticker).toUpperCase();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [summary, quote]: [any, any] = await Promise.all([
      yf.quoteSummary(sym, {
        modules: [
          'financialData', 'defaultKeyStatistics', 'price', 'assetProfile',
          'incomeStatementHistory', 'cashflowStatementHistory', 'balanceSheetHistory',
        ],
      }),
      yf.quote(sym),
    ]);

    const fd = summary.financialData ?? {};
    const ks = summary.defaultKeyStatistics ?? {};
    const price = summary.price ?? {};
    const ap = summary.assetProfile ?? {};
    const ish = summary.incomeStatementHistory?.incomeStatementHistory ?? [];
    const cfs = summary.cashflowStatementHistory?.cashflowStatements ?? [];
    const bss = summary.balanceSheetHistory?.balanceSheetStatements ?? [];

    const totalCash: number = fd.totalCash ?? 0;
    const totalDebt: number = fd.totalDebt ?? 0;
    const sharesOutstanding: number = ks.sharesOutstanding ?? quote.sharesOutstanding ?? 1;

    const netCashPerShare = (totalCash - totalDebt) / Math.max(sharesOutstanding, 1);

    // 연간 순이익 히스토리로 EPS CAGR 계산 (incomeStatementHistory: 최대 4개년)
    let epsCAGR: number | null = null;
    let epsCAGRYears = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validISH: { ni: number }[] = ish
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.netIncome != null && r.netIncome > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({ ni: r.netIncome as number }));
    // Yahoo 반환 순서는 최신 → 과거
    if (validISH.length >= 2) {
      const latest = validISH[0].ni;
      const oldest = validISH[validISH.length - 1].ni;
      epsCAGRYears = validISH.length - 1;
      epsCAGR = (Math.pow(latest / oldest, 1 / epsCAGRYears) - 1) * 100;
      epsCAGR = Math.max(-30, Math.min(60, parseFloat(epsCAGR.toFixed(1))));
    }

    // FCF 경고용 YoY 증가율 계산 (데이터 부족 시 null)
    const yoyGrowth = (latest: number | null | undefined, prev: number | null | undefined): number | null => {
      if (latest == null || prev == null || prev === 0) return null;
      return (latest - prev) / Math.abs(prev);
    };

    // CapEx: capitalExpenditures는 음수(현금 유출)이므로 절댓값 비교
    let capexGrowth: number | null = null;
    if (cfs.length >= 2 && cfs[0].capitalExpenditures != null && cfs[1].capitalExpenditures != null) {
      capexGrowth = yoyGrowth(Math.abs(cfs[0].capitalExpenditures), Math.abs(cfs[1].capitalExpenditures));
    }

    // 매출채권 YoY
    let receivablesGrowth: number | null = null;
    if (bss.length >= 2 && bss[0].netReceivables != null && bss[1].netReceivables != null) {
      receivablesGrowth = yoyGrowth(bss[0].netReceivables, bss[1].netReceivables);
    }

    // 재고 YoY
    let inventoryGrowth: number | null = null;
    if (bss.length >= 2 && bss[0].inventory != null && bss[1].inventory != null) {
      inventoryGrowth = yoyGrowth(bss[0].inventory, bss[1].inventory);
    }

    // Debt ratio: approximate from debtToEquity if available
    // D/E (as %) → debt ratio = (D/E/100) / (1 + D/E/100)
    let debtRatio = 0;
    if (fd.debtToEquity != null && fd.debtToEquity > 0) {
      const de = fd.debtToEquity / 100;
      debtRatio = de / (1 + de);
    } else if (ks.bookValue && ks.bookValue > 0 && totalDebt > 0) {
      const equity = ks.bookValue * sharesOutstanding;
      debtRatio = totalDebt / (totalDebt + equity);
    }

    const currentPrice: number = fd.currentPrice ?? quote.regularMarketPrice ?? 0;

    // TTM EPS: 표준 필드 → netIncomeToCommon / shares (한국·신흥국 주식 대응)
    const ttmEPS: number =
      ks.trailingEps ??
      quote.epsTrailingTwelveMonths ??
      (ks.netIncomeToCommon != null && sharesOutstanding > 1
        ? ks.netIncomeToCommon / sharesOutstanding
        : null) ??
      0;

    // Forward EPS: 표준 필드 → epsCurrentYear (한국 주식 애널리스트 컨센서스)
    const forwardEPS: number =
      ks.forwardEps ??
      quote.epsForward ??
      fd.forwardEps ??
      quote.epsCurrentYear ??
      ttmEPS; // 최후 fallback: TTM EPS 사용

    const stockData: StockData = {
      ticker: sym,
      companyName: price.shortName ?? price.longName ?? quote.longName ?? sym,
      currentPrice,
      forwardEPS,
      ttmEPS,
      netCashPerShare,
      totalCash,
      totalDebt,
      debtRatio,
      revenueGrowth: fd.revenueGrowth ?? 0,
      epsCAGR,
      epsCAGRYears,
      capexGrowth,
      receivablesGrowth,
      inventoryGrowth,
      grossMargin: fd.grossMargins ?? 0,
      operatingMargin: fd.operatingMargins ?? 0,
      returnOnEquity: fd.returnOnEquity ?? 0,
      sharesOutstanding,
      currency: price.currency ?? quote.currency ?? 'USD',
      sector: ap.sector ?? '',
      industry: ap.industry ?? '',
      exchange: price.exchangeName ?? quote.fullExchangeName ?? '',
      beta: ks.beta ?? quote.beta ?? undefined,
    };

    return NextResponse.json(stockData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[analyze] ${sym}:`, message);
    return NextResponse.json(
      { error: `'${sym}' 데이터를 불러오지 못했습니다. 티커를 다시 확인해주세요.` },
      { status: 404 }
    );
  }
}
