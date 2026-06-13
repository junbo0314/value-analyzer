import { IVInputs, IVResult } from '@/types';

// IV = ((EPS × [Base_PER + (g_Multiplier × g)] × CP × ROE_Factor × 4.0) / Y × DF) + Net_Cash_Per_Share
// Y is AAA bond rate as a percentage number (e.g. 4.5 for 4.5%), matching Graham's original formula
export function calculateIV(inputs: IVInputs, currentPrice: number): IVResult {
  const { eps, basePER, gMultiplier, g, cp, roeFactor, y, df, netCashPerShare } = inputs;

  const adjustedPER = basePER + gMultiplier * g;
  const step1 = eps * adjustedPER;                     // EPS × adj.PER
  const step2 = step1 * cp * roeFactor * 4.0;          // × CP × ROE_Factor × 4.0
  const step3 = step2 / y;                              // ÷ Y (AAA rate as %)
  const step4 = step3 * df;                             // × DF
  const iv = step4 + netCashPerShare;                   // + Net Cash

  const deviation = ((iv - currentPrice) / currentPrice) * 100;
  const isUndervalued = iv > currentPrice;
  const marginOfSafety = isUndervalued ? ((iv - currentPrice) / iv) * 100 : 0;

  return {
    iv,
    currentPrice,
    deviation,
    isUndervalued,
    marginOfSafety,
    inputs,
    steps: { adjustedPER, step1, step2, step3, step4 },
  };
}

export function getDefaultCP(grossMargin: number): number {
  if (grossMargin > 0.6) return 1.2;
  if (grossMargin > 0.4) return 1.1;
  if (grossMargin > 0.25) return 1.0;
  if (grossMargin > 0.1) return 0.9;
  return 0.8;
}

export function getROEFactor(roe: number): number {
  if (roe >= 0.20) return 1.10;
  if (roe >= 0.15) return 1.05;
  if (roe >= 0.10) return 1.00;
  if (roe >= 0.05) return 0.95;
  return 0.90;
}

export function getDefaultDF(debtRatio: number): number {
  if (debtRatio < 0.2) return 1.0;
  if (debtRatio < 0.4) return 0.95;
  if (debtRatio < 0.6) return 0.9;
  if (debtRatio < 0.8) return 0.8;
  return 0.7;
}

export function formatCurrency(value: number, currency: string): string {
  if (currency === 'KRW') {
    return `₩${Math.round(value).toLocaleString('ko-KR')}`;
  }
  if (value >= 1000) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}
