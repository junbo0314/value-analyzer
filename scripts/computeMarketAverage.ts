#!/usr/bin/env tsx
/**
 * scripts/computeMarketAverage.ts
 *
 * 사용법:
 *   npm run compute-market-avg          # 전체 319개
 *   npm run compute-market-avg -- --test  # 테스트: 30개만
 */

import path from 'path';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

import { MARKET_UNIVERSE } from '../src/lib/marketUniverse';
import { assignGradeByMoatScore } from '../src/lib/moatScore';
import {
  calculateIV,
  getDefaultCP,
  getROEFactor,
  getDefaultDF,
} from '../src/lib/calculations';
import { GRADE_CONFIGS, G_CAP_BY_GRADE } from '../src/types';

// ── CLI 옵션 ────────────────────────────────────────────────────────────────
const isTest = process.argv.includes('--test');
const DELAY_MS = 120;
const tickers = isTest ? MARKET_UNIVERSE.slice(0, 30) : MARKET_UNIVERSE;

console.log(`\n[compute-market-avg] ${isTest ? 'TEST MODE (30개)' : `전체 ${tickers.length}개`}`);

// ── AAA 금리 가져오기 ────────────────────────────────────────────────────────
async function fetchAAARate(): Promise<number> {
  try {
    const res = await yf.quote('^TNX');
    const rate = (res.regularMarketPrice ?? 0) + 0.5;
    if (rate > 0.5) { console.log(`  AAA 금리: ${rate.toFixed(2)}%`); return rate; }
  } catch { /* fallback */ }
  console.log('  AAA 금리 fetch 실패 → 기본값 5.0% 사용');
  return 5.0;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
(async () => {
  const aaaRate = await fetchAAARate();

  // 1단계: 각 종목 데이터 수집
  interface StockRow {
    ticker: string;
    sector: string;
    grossMargin: number;
    operatingMargin: number;
    marketCap: number;
    eps: number;
    roe: number;
    debtRatio: number;
    revenueGrowth: number;
    epsCAGR: number | null;
    netCashPerShare: number;
    currentPrice: number;
  }

  const collected: StockRow[] = [];
  let success = 0, fail = 0;

  console.log('\n─── 1단계: 종목 데이터 수집 ───');
  for (let i = 0; i < tickers.length; i++) {
    const sym = tickers[i];
    try {
      const [summary, quote] = await Promise.all([
        yf.quoteSummary(sym, {
          modules: ['financialData', 'defaultKeyStatistics', 'price',
                    'assetProfile', 'incomeStatementHistory'],
        }),
        yf.quote(sym),
      ]);

      const fd  = summary.financialData        ?? {};
      const ks  = summary.defaultKeyStatistics ?? {};
      const pr  = summary.price                ?? {};
      const ap  = summary.assetProfile         ?? {};
      const ish = summary.incomeStatementHistory?.incomeStatementHistory ?? [];

      const currency: string = pr.currency ?? quote.currency ?? 'USD';
      if (currency === 'KRW') { fail++; continue; }

      const currentPrice: number = fd.currentPrice ?? quote.regularMarketPrice ?? 0;
      const shares: number = ks.sharesOutstanding ?? quote.sharesOutstanding ?? 1;
      const totalCash: number  = fd.totalCash ?? 0;
      const totalDebt: number  = fd.totalDebt ?? 0;
      const netCashPerShare    = (totalCash - totalDebt) / Math.max(shares, 1);
      const marketCap: number  = pr.marketCap ?? quote.marketCap ?? (currentPrice * shares);

      const ttmEPS: number =
        ks.trailingEps ?? quote.epsTrailingTwelveMonths ?? 0;
      const forwardEPS: number =
        ks.forwardEps ?? quote.epsForward ?? fd.forwardEps ?? ttmEPS;
      const eps = forwardEPS > 0 ? forwardEPS : ttmEPS;
      if (eps <= 0 || currentPrice <= 0) { fail++; continue; }

      let debtRatio = 0;
      const de = fd.debtToEquity;
      if (de && de > 0) { const r = de / 100; debtRatio = r / (1 + r); }

      // EPS CAGR
      let epsCAGR: number | null = null;
      const validISH = ish
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((r: any) => r.netIncome != null && r.netIncome > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.netIncome as number);
      if (validISH.length >= 2) {
        const years = validISH.length - 1;
        epsCAGR = (Math.pow(validISH[0] / validISH[validISH.length - 1], 1 / years) - 1) * 100;
        epsCAGR = Math.max(-30, Math.min(60, epsCAGR));
      }

      collected.push({
        ticker: sym,
        sector: ap.sector ?? 'Unknown',
        grossMargin: fd.grossMargins ?? 0,
        operatingMargin: fd.operatingMargins ?? 0,
        marketCap,
        eps,
        roe: fd.returnOnEquity ?? 0,
        debtRatio,
        revenueGrowth: fd.revenueGrowth ?? 0,
        epsCAGR,
        netCashPerShare,
        currentPrice,
      });
      success++;
    } catch {
      fail++;
    }

    if ((i + 1) % 10 === 0 || i === tickers.length - 1) {
      process.stdout.write(`  [${i + 1}/${tickers.length}] 성공 ${success} / 실패 ${fail}\r`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.log(`\n  수집 완료: 성공 ${success}개 / 실패 ${fail}개`);

  if (collected.length < 5) {
    console.error('수집된 종목이 너무 적습니다. 종료.');
    process.exit(1);
  }

  // 2단계: moat score → 등급 배정
  console.log('\n─── 2단계: 등급 배정 (moat score) ───');
  const gradeMap = assignGradeByMoatScore(collected);

  // 3단계: IV/Price 계산
  console.log('─── 3단계: IV/Price 계산 ───');
  const ivpValues: number[] = [];

  for (const row of collected) {
    const grade = gradeMap.get(row.ticker) ?? 3;
    const cfg   = GRADE_CONFIGS.find((c) => c.grade === grade)!;
    const gCap  = G_CAP_BY_GRADE[grade as keyof typeof G_CAP_BY_GRADE];

    const rawG = row.epsCAGR ?? row.revenueGrowth * 100;
    const g    = Math.min(Math.max(rawG, -10), gCap);

    const cp        = getDefaultCP(row.grossMargin);
    const roeFactor = getROEFactor(row.roe);
    const df        = getDefaultDF(row.debtRatio);

    const result = calculateIV(
      {
        eps: row.eps,
        basePER: cfg.basePER,
        gMultiplier: cfg.gMultiplier,
        g,
        cp,
        roeFactor,
        y: aaaRate,
        df,
        netCashPerShare: row.netCashPerShare,
      },
      row.currentPrice
    );

    const ivp = result.iv / row.currentPrice;
    if (isFinite(ivp) && ivp > 0 && ivp < 20) {
      ivpValues.push(ivp);
    }
  }

  ivpValues.sort((a, b) => a - b);
  const avg    = ivpValues.reduce((a, b) => a + b, 0) / ivpValues.length;
  const midIdx = Math.floor(ivpValues.length / 2);
  const median = ivpValues.length % 2 === 0
    ? (ivpValues[midIdx - 1] + ivpValues[midIdx]) / 2
    : ivpValues[midIdx];

  console.log(`  유효 종목: ${ivpValues.length}개`);
  console.log(`  평균 IV/Price: ${avg.toFixed(4)}`);
  console.log(`  중앙 IV/Price: ${median.toFixed(4)}`);

  // 4단계: JSON 저장
  const output = {
    computedAt: new Date().toISOString(),
    sampleSize: ivpValues.length,
    averageIVtoPrice: parseFloat(avg.toFixed(4)),
    medianIVtoPrice:  parseFloat(median.toFixed(4)),
    aaaRate:          parseFloat(aaaRate.toFixed(2)),
  };

  const outDir  = path.join(process.cwd(), 'data');
  const outPath = path.join(outDir, 'marketAverage.json');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n저장 완료: ${outPath}`);
  console.log(JSON.stringify(output, null, 2));
})();
