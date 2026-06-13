'use client';

import { IVResult, StockData } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

interface Props {
  result: IVResult;
  stockData: StockData;
}

export default function IntrinsicValueCard({ result, stockData }: Props) {
  const { iv, currentPrice, deviation, isUndervalued, marginOfSafety } = result;

  const fmtPrice = (v: number) => formatCurrency(v, stockData.currency);

  // Gauge: map deviation -100% to +100% → 0 to 100%
  const gaugePos = Math.min(Math.max(((deviation + 100) / 200) * 100, 2), 98);

  const deviationColor =
    deviation > 50
      ? 'text-green-400'
      : deviation > 10
      ? 'text-emerald-400'
      : deviation > -10
      ? 'text-yellow-400'
      : deviation > -50
      ? 'text-orange-400'
      : 'text-red-400';

  const cardBorder = isUndervalued
    ? 'border-green-700/40 from-green-950/40 to-emerald-950/20'
    : 'border-red-700/40 from-red-950/40 to-rose-950/20';

  const verdict = getVerdict(deviation);

  return (
    <div className={`bg-gradient-to-br ${cardBorder} border rounded-xl p-6 space-y-5`}>
      {/* Top: IV vs Current Price */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">계산된 내재가치 (IV)</p>
          <p className="text-4xl font-bold text-white tabular-nums">{fmtPrice(iv)}</p>
          <p className="text-gray-500 text-sm mt-1">
            현재 주가: <span className="text-gray-300 tabular-nums">{fmtPrice(currentPrice)}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1 mb-1">
            {isUndervalued ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <span className={`text-3xl font-bold tabular-nums ${deviationColor}`}>
              {deviation > 0 ? '+' : ''}
              {deviation.toFixed(1)}%
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            {isUndervalued ? '저평가 (IV > 현재가)' : '고평가 (현재가 > IV)'}
          </p>
          {isUndervalued && marginOfSafety > 0 && (
            <p className="text-green-400 text-xs mt-1">
              안전마진 {marginOfSafety.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {/* Gauge */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>← 고평가</span>
          <span>적정</span>
          <span>저평가 →</span>
        </div>
        <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 opacity-30 rounded-full" />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white rounded-full shadow shadow-white/80 transition-all duration-300"
            style={{ left: `${gaugePos}%` }}
          />
          <div
            className={`absolute top-0 bottom-0 rounded-full opacity-20 transition-all duration-300 ${isUndervalued ? 'bg-green-500' : 'bg-red-500'}`}
            style={
              isUndervalued
                ? { left: `${gaugePos}%`, right: '0%' }
                : { left: '0%', right: `${100 - gaugePos}%` }
            }
          />
        </div>
        <div className="flex justify-center mt-2">
          <span className="text-xs text-gray-500 tabular-nums">
            IV / 현재가 = {(iv / currentPrice).toFixed(2)}×
          </span>
        </div>
      </div>

      {/* Verdict */}
      <div
        className={`rounded-lg p-4 ${isUndervalued ? 'bg-green-950/40' : Math.abs(deviation) < 10 ? 'bg-yellow-950/40' : 'bg-red-950/40'}`}
      >
        <p className="text-sm leading-relaxed">
          <span className={`font-semibold ${verdict.labelColor}`}>{verdict.label}</span>{' '}
          <span className="text-gray-300">{verdict.body}</span>
        </p>
      </div>
    </div>
  );
}

function getVerdict(deviation: number) {
  if (deviation > 50)
    return {
      labelColor: 'text-green-300',
      label: '강한 매수 시그널.',
      body: `내재가치 대비 ${deviation.toFixed(0)}% 할인된 수준입니다. 설정한 성장 가정이 실현된다면 상당한 업사이드가 존재합니다.`,
    };
  if (deviation > 20)
    return {
      labelColor: 'text-emerald-300',
      label: '저평가 구간.',
      body: `내재가치 대비 ${deviation.toFixed(0)}% 낮게 거래 중입니다. 안전마진을 확보할 수 있는 수준입니다.`,
    };
  if (deviation > 5)
    return {
      labelColor: 'text-green-300',
      label: '소폭 저평가.',
      body: `현재가가 내재가치 대비 ${deviation.toFixed(1)}% 낮습니다. 성장 가정 변화에 민감하므로 변수 재확인이 필요합니다.`,
    };
  if (deviation > -5)
    return {
      labelColor: 'text-yellow-300',
      label: '적정 가치 수준.',
      body: `내재가치와 현재가의 괴리가 ${Math.abs(deviation).toFixed(1)}%로 미미합니다. 추가 촉매 여부를 확인하세요.`,
    };
  if (deviation > -20)
    return {
      labelColor: 'text-orange-300',
      label: '소폭 고평가.',
      body: `현재가가 내재가치 대비 ${Math.abs(deviation).toFixed(1)}% 높습니다. 성장 기대치가 어느 정도 주가에 반영되어 있습니다.`,
    };
  return {
    labelColor: 'text-red-300',
    label: '고평가 구간.',
    body: `현재가가 내재가치 대비 ${Math.abs(deviation).toFixed(0)}% 높습니다. 현재의 성장 가정 하에서는 투자 매력이 낮습니다.`,
  };
}
