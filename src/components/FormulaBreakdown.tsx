'use client';

import { IVResult, MarketGrade, GRADE_CONFIGS } from '@/types';

interface Props {
  result: IVResult;
  selectedGrade: MarketGrade;
}

function fmt(v: number, currency?: string): string {
  if (currency === 'KRW') return Math.round(v).toLocaleString('ko-KR');
  return Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2);
}

export default function FormulaBreakdown({ result, selectedGrade }: Props) {
  const { inputs, steps } = result;
  const cfg = GRADE_CONFIGS.find((c) => c.grade === selectedGrade)!;

  // ── 5-step breakdown (③에서 ×4.0 직후 ÷Y를 같은 단계로 표시) ──
  const rows = [
    {
      step: '①',
      label: '조정 PER',
      formula: `${inputs.basePER} + (${inputs.gMultiplier} × ${inputs.g.toFixed(1)})`,
      value: steps.adjustedPER,
      color: 'text-sky-400',
      note: `Base_PER = ${inputs.basePER}  ·  g_Mult = ${inputs.gMultiplier}  ·  g = ${inputs.g.toFixed(1)}%`,
    },
    {
      step: '②',
      label: 'EPS × 조정 PER',
      formula: `${fmt(inputs.eps)} × ${fmt(steps.adjustedPER)}`,
      value: steps.step1,
      color: 'text-blue-400',
      note: `EPS = ${fmt(inputs.eps)}`,
    },
    {
      // ③ : ×CP×ROE_Factor×4.0 한 뒤 바로 ÷Y — 한 행에 묶어 연산 순서를 명확히
      step: '③',
      label: '× CP × ROE_Factor × 4.0  ÷  Y  (Graham 조정)',
      formula: `${fmt(steps.step1)} × ${inputs.cp.toFixed(2)} × ${inputs.roeFactor.toFixed(2)} × 4.0  ÷  ${inputs.y.toFixed(2)}`,
      value: steps.step3,           // step3 = (step1 × CP × ROE_Factor × 4.0) / Y
      color: 'text-yellow-400',
      note: `CP = ${inputs.cp.toFixed(2)}  ·  ROE_Factor = ${inputs.roeFactor.toFixed(2)}  ·  Graham 상수 4.0  ·  Y(AAA 금리) = ${inputs.y.toFixed(2)}%`,
      highlight: true,
    },
    {
      step: '④',
      label: '× DF  (부채 페널티)',
      formula: `${fmt(steps.step3)} × ${inputs.df.toFixed(2)}`,
      value: steps.step4,
      color: 'text-orange-400',
      note: `DF = ${inputs.df.toFixed(2)}`,
    },
    {
      step: '⑤',
      label: '+ 순현금 / 주  →  내재가치 (IV)',
      formula: `${fmt(steps.step4)} + ${fmt(inputs.netCashPerShare)}`,
      value: result.iv,
      color: 'text-purple-400',
      note: `Net Cash / Share = ${fmt(inputs.netCashPerShare)}`,
      isLast: true,
    },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          공식 계산 상세
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded border ${cfg.borderClass} ${cfg.textAccentClass}`}>
          {cfg.grade}등급 · {cfg.name}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.step}
            className={[
              'rounded-lg p-3 font-mono text-sm',
              row.isLast
                ? 'bg-blue-950/40 border border-blue-700/40'
                : row.highlight
                ? 'bg-yellow-950/30 border border-yellow-700/30'
                : 'bg-gray-800/60',
            ].join(' ')}
          >
            {/* 헤더 라인: 단계 · 레이블 · 결과값 */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-gray-500 text-xs shrink-0">{row.step}</span>
                <span className="text-gray-300 text-xs">{row.label}</span>
              </div>
              <span className={`font-bold tabular-nums shrink-0 ${row.color}`}>
                {fmt(row.value)}
              </span>
            </div>
            {/* 식 라인 */}
            <p className="text-gray-500 text-xs mt-1 pl-5 break-all">
              = {row.formula}
            </p>
            {/* 보조 설명 */}
            {row.note && (
              <p className="text-gray-600 text-xs mt-0.5 pl-5 truncate">{row.note}</p>
            )}
          </div>
        ))}
      </div>

      {/* 전체 공식 */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs mb-1.5">전체 공식</p>
        <p className="font-mono text-xs leading-relaxed break-all">
          <span className="text-gray-400">IV = (</span>
          <span className="text-blue-300">EPS({fmt(inputs.eps)})</span>
          <span className="text-gray-400"> × [</span>
          <span className="text-sky-300">{inputs.basePER} + ({inputs.gMultiplier} × {inputs.g})</span>
          <span className="text-gray-400">] × </span>
          <span className="text-green-300">{inputs.cp.toFixed(2)}</span>
          <span className="text-gray-400"> × </span>
          <span className="text-teal-300">{inputs.roeFactor.toFixed(2)}</span>
          <span className="text-gray-400"> × </span>
          <span className="text-green-300">4.0</span>
          <span className="text-yellow-300"> ÷ {inputs.y.toFixed(2)}</span>
          <span className="text-gray-400"> × </span>
          <span className="text-orange-300">{inputs.df.toFixed(2)}</span>
          <span className="text-gray-400">) + </span>
          <span className="text-purple-300">{fmt(inputs.netCashPerShare)}</span>
          <span className="text-gray-400"> = </span>
          <span className="text-white font-bold">{fmt(result.iv)}</span>
        </p>
      </div>
    </div>
  );
}
