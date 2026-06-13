'use client';

import { StockData, MarketGrade, G_CAP_BY_GRADE } from '@/types';
import { getDefaultCP, getDefaultDF } from '@/lib/calculations';
import { Lock } from 'lucide-react';

interface Props {
  g: number;
  setG: (v: number) => void;
  cp: number;
  setCp: (v: number) => void;
  df: number;
  setDf: (v: number) => void;
  aaaRate: number;
  stockData: StockData;
  selectedGrade: MarketGrade;
}

const CP_PRESETS = [
  { label: '낮음', value: 0.8, hint: '마진 <10%' },
  { label: '보통', value: 0.9, hint: '10–25%' },
  { label: '높음', value: 1.0, hint: '25–40%' },
  { label: '매우높음', value: 1.1, hint: '40–60%' },
];

const DF_PRESETS = [
  { label: '무부채', value: 1.0, hint: '<20%' },
  { label: '저부채', value: 0.95, hint: '20–40%' },
  { label: '중부채', value: 0.9, hint: '40–60%' },
  { label: '고부채', value: 0.8, hint: '>60%' },
];

export default function VariablePanel({ g, setG, cp, setCp, df, setDf, aaaRate, stockData, selectedGrade }: Props) {
  const defaultCP = getDefaultCP(stockData.grossMargin);
  const defaultDF = getDefaultDF(stockData.debtRatio);
  const gCap = G_CAP_BY_GRADE[selectedGrade];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-6">
      {/* ── Growth Rate ── */}
      <SliderSection
        label="g"
        fullLabel="성장률 (g)"
        desc="예상 연간 성장률"
        unit="%"
        value={g}
        color="blue"
        displayValue={`${g > 0 ? '+' : ''}${g}%`}
        displayColor="text-blue-400"
      >
        <input
          type="range"
          min="-10"
          max="40"
          step="0.5"
          value={g}
          onChange={(e) => setG(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>-10%</span>
          <span>0%</span>
          <span>20%</span>
          <span>40%</span>
        </div>
        {stockData.epsCAGR != null ? (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block shrink-0" />
            EPS CAGR ({stockData.epsCAGRYears}년): {stockData.epsCAGR > 0 ? '+' : ''}{stockData.epsCAGR.toFixed(1)}%
            <button
              onClick={() => setG(Math.min(Math.max(Math.round(stockData.epsCAGR! * 2) / 2, -10), gCap))}
              className="ml-1 text-yellow-400 hover:text-yellow-300 underline underline-offset-2"
            >
              적용
            </button>
          </p>
        ) : stockData.revenueGrowth !== 0 ? (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block shrink-0" />
            매출 성장률(대체): {(stockData.revenueGrowth * 100).toFixed(1)}%
            <button
              onClick={() => setG(Math.min(Math.max(Math.round(stockData.revenueGrowth * 100 * 2) / 2, -10), gCap))}
              className="ml-1 text-yellow-400 hover:text-yellow-300 underline underline-offset-2"
            >
              적용
            </button>
          </p>
        ) : null}
        {g > gCap && (
          <p className="text-xs text-orange-400 mt-2 flex items-start gap-1.5">
            <span className="shrink-0">⚠</span>
            <span>
              {selectedGrade}등급 기준 일반적인 장기 성장률 상한은 {gCap}%입니다.
              현재 설정({g}%)은 공격적인 가정입니다.
            </span>
          </p>
        )}
      </SliderSection>

      {/* ── Pricing Power (CP) ── */}
      <SliderSection
        label="CP"
        fullLabel="가격전가력 (CP)"
        desc="원가 상승분을 고객에 전가하는 능력"
        displayValue={cp.toFixed(2)}
        displayColor="text-green-400"
      >
        <div className="grid grid-cols-4 gap-1 mb-3">
          {CP_PRESETS.map(({ label, value, hint }) => (
            <button
              key={value}
              onClick={() => setCp(value)}
              title={hint}
              className={[
                'text-xs py-1.5 rounded border transition-colors leading-tight',
                Math.abs(cp - value) < 0.01
                  ? 'bg-green-700 border-green-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.05"
          value={cp}
          onChange={(e) => setCp(parseFloat(e.target.value))}
          className="slider-green w-full"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0.5</span>
          <span>1.0</span>
          <span>1.5</span>
        </div>
        {stockData.grossMargin > 0 && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block shrink-0" />
            총이익률 {(stockData.grossMargin * 100).toFixed(1)}% → 권장 기본값 {defaultCP.toFixed(2)}
            <button
              onClick={() => setCp(defaultCP)}
              className="ml-1 text-green-400 hover:text-green-300 underline underline-offset-2"
            >
              적용
            </button>
          </p>
        )}
      </SliderSection>

      {/* ── Debt Penalty (DF) ── */}
      <SliderSection
        label="DF"
        fullLabel="부채 페널티 (DF)"
        desc="부채 수준에 따른 내재가치 할인율"
        displayValue={df.toFixed(2)}
        displayColor="text-orange-400"
      >
        <div className="grid grid-cols-4 gap-1 mb-3">
          {DF_PRESETS.map(({ label, value, hint }) => (
            <button
              key={value}
              onClick={() => setDf(value)}
              title={`부채비율 ${hint}`}
              className={[
                'text-xs py-1.5 rounded border transition-colors',
                Math.abs(df - value) < 0.01
                  ? 'bg-orange-700 border-orange-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min="0.5"
          max="1.0"
          step="0.05"
          value={df}
          onChange={(e) => setDf(parseFloat(e.target.value))}
          className="slider-orange w-full"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0.5</span>
          <span>0.75</span>
          <span>1.0</span>
        </div>
        {stockData.debtRatio > 0 && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block shrink-0" />
            부채비율 {(stockData.debtRatio * 100).toFixed(0)}% → 권장 기본값 {defaultDF.toFixed(2)}
            <button
              onClick={() => setDf(defaultDF)}
              className="ml-1 text-orange-400 hover:text-orange-300 underline underline-offset-2"
            >
              적용
            </button>
          </p>
        )}
      </SliderSection>

      {/* ── AAA Rate (read-only) ── */}
      <div className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Lock className="w-3 h-3 text-gray-500" />
            <span className="text-sm font-medium text-white">Y (AAA 금리)</span>
          </div>
          <p className="text-gray-500 text-xs">10Y Treasury + 0.5% 스프레드 · 실시간 연동</p>
        </div>
        <span className="text-2xl font-bold text-yellow-400 tabular-nums">{aaaRate.toFixed(2)}%</span>
      </div>
    </div>
  );
}

function SliderSection({
  label,
  fullLabel,
  desc,
  displayValue,
  displayColor,
  children,
}: {
  label: string;
  fullLabel: string;
  desc: string;
  unit?: string;
  value?: number;
  color?: string;
  displayValue: string;
  displayColor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {label}
            </span>
            <span className="text-sm font-semibold text-white">{fullLabel}</span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${displayColor}`}>{displayValue}</span>
      </div>
      {children}
    </div>
  );
}
