import type { MarketGrade } from '@/types';

interface StockInput {
  ticker: string;
  sector: string;
  grossMargin: number;
  operatingMargin: number;
  marketCap: number;
}

function zScoreWithinGroup(values: number[]): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  if (std < 1e-9) return values.map(() => 0);
  return values.map((v) => (v - mean) / std);
}

/**
 * 섹터 내 gross margin / operating margin / log(market cap)을 표준화한 뒤
 * 평균 moat score → 분위수 기준으로 1~4등급 부여.
 * (backtest의 등급 배정 로직과 동일)
 */
export function assignGradeByMoatScore(
  stocks: StockInput[]
): Map<string, MarketGrade> {
  const sectors = Array.from(new Set(stocks.map((s) => s.sector)));

  const zGm:  number[] = new Array(stocks.length).fill(0);
  const zOm:  number[] = new Array(stocks.length).fill(0);
  const zLmc: number[] = new Array(stocks.length).fill(0);

  for (const sector of sectors) {
    const idx = stocks.map((s, i) => (s.sector === sector ? i : -1)).filter((i) => i >= 0);
    if (idx.length < 2) continue;

    const gm_vals  = idx.map((i) => stocks[i].grossMargin);
    const om_vals  = idx.map((i) => stocks[i].operatingMargin);
    const lmc_vals = idx.map((i) => Math.log(Math.max(stocks[i].marketCap, 1)));

    const zgm  = zScoreWithinGroup(gm_vals);
    const zom  = zScoreWithinGroup(om_vals);
    const zlmc = zScoreWithinGroup(lmc_vals);

    idx.forEach((si, ii) => {
      zGm[si]  = zgm[ii];
      zOm[si]  = zom[ii];
      zLmc[si] = zlmc[ii];
    });
  }

  const moatScores = stocks.map((_, i) => (zGm[i] + zOm[i] + zLmc[i]) / 3);

  // 분위수 컷 계산
  const sorted = [...moatScores].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q2 = sorted[Math.floor(sorted.length * 0.50)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  const result = new Map<string, MarketGrade>();
  stocks.forEach((s, i) => {
    const score = moatScores[i];
    let grade: MarketGrade;
    if (score >= q3)      grade = 1;
    else if (score >= q2) grade = 2;
    else if (score >= q1) grade = 3;
    else                  grade = 4;
    result.set(s.ticker, grade);
  });

  return result;
}
