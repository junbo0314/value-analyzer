'use client';

import { useState, useEffect } from 'react';
import { BarChart2, AlertCircle, RefreshCw } from 'lucide-react';
import type { MarketAverageData } from '@/app/api/market-average/route';
import type { StockData } from '@/types';
import { calculateEVtoEBIT } from '@/lib/calculations';

interface Props {
  currentIVtoPrice: number | null;
  stockData?: StockData;
}

export default function MarketContextCard({ currentIVtoPrice, stockData }: Props) {
  const [data, setData]   = useState<MarketAverageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/market-average')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d as MarketAverageData);
      })
      .catch(() => setError('시장 평균 데이터 로드 실패'));
  }, []);

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-2 text-gray-500 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>시장 평균 없음 — <code>npm run compute-market-avg</code> 실행 후 재배포</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-2 text-gray-600 text-xs">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        시장 평균 로딩 중…
      </div>
    );
  }

  const ratio = currentIVtoPrice != null ? currentIVtoPrice / data.averageIVtoPrice : null;
  const daysAgo = Math.floor(
    (Date.now() - new Date(data.computedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const dateLabel = new Date(data.computedAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  // 비율에 따른 색상·레이블
  const ratioColor =
    ratio === null      ? 'text-gray-400'
    : ratio >= 1.5      ? 'text-green-400'
    : ratio >= 1.0      ? 'text-blue-400'
    : ratio >= 0.5      ? 'text-yellow-400'
    : 'text-red-400';

  const ratioLabel =
    ratio === null      ? '등급을 선택하면 비교값이 표시됩니다'
    : ratio >= 1.5      ? '시장 평균 대비 크게 저평가'
    : ratio >= 1.0      ? '시장 평균 대비 저평가'
    : ratio >= 0.5      ? '시장 평균 수준'
    : '시장 평균 대비 고평가';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          S&amp;P 500 시장 평균 비교
        </span>
        {data.stale && (
          <span className="text-xs text-yellow-600 ml-auto">
            {daysAgo}일 전 기준
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* 시장 평균 IV/Price */}
        <div>
          <p className="text-gray-600 text-xs mb-1">시장 평균 IV/Price</p>
          <p className="text-white text-lg font-bold tabular-nums">
            {data.averageIVtoPrice.toFixed(2)}
            <span className="text-gray-500 text-sm font-normal">배</span>
          </p>
        </div>

        {/* 시장 중앙값 */}
        <div>
          <p className="text-gray-600 text-xs mb-1">중앙값 IV/Price</p>
          <p className="text-gray-300 text-lg font-semibold tabular-nums">
            {data.medianIVtoPrice.toFixed(2)}
            <span className="text-gray-500 text-sm font-normal">배</span>
          </p>
        </div>

        {/* 현재 종목 IV/Price */}
        <div>
          <p className="text-gray-600 text-xs mb-1">이 종목 IV/Price</p>
          <p className={`text-lg font-bold tabular-nums ${currentIVtoPrice != null ? 'text-blue-400' : 'text-gray-600'}`}>
            {currentIVtoPrice != null ? currentIVtoPrice.toFixed(2) : '—'}
            {currentIVtoPrice != null && <span className="text-gray-500 text-sm font-normal">배</span>}
          </p>
        </div>

        {/* 시장 대비 배율 */}
        <div>
          <p className="text-gray-600 text-xs mb-1">시장 대비</p>
          <p className={`text-lg font-bold tabular-nums ${ratioColor}`}>
            {ratio != null ? `${ratio.toFixed(2)}배` : '—'}
          </p>
        </div>
      </div>

      {/* IV/Price 해석 */}
      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
        <p className={`text-sm font-medium ${ratioColor}`}>{ratioLabel}</p>
        <p className="text-gray-600 text-xs shrink-0">
          기준일 {dateLabel} · {data.sampleSize}개 종목
        </p>
      </div>

      {/* 섹터별 EV/EBIT 비교 */}
      {stockData && data.sectorEVtoEBIT && (() => {
        const sector = stockData.sector;
        const sectorData = sector ? data.sectorEVtoEBIT![sector] : null;
        const stockEV = calculateEVtoEBIT(stockData);

        if (!sectorData) return null;

        const deviation = stockEV != null
          ? ((stockEV - sectorData.median) / sectorData.median) * 100
          : null;

        const deviationColor =
          deviation === null       ? 'text-gray-400'
          : deviation < -20        ? 'text-green-400'
          : deviation <= 20        ? 'text-gray-300'
          : deviation <= 50        ? 'text-yellow-400'
          : 'text-orange-400';

        const deviationLabel =
          deviation === null       ? 'EV/EBIT 계산 불가 (영업적자 또는 음수 EV)'
          : deviation < -20        ? '섹터 평균 대비 저평가'
          : deviation <= 20        ? '섹터 평균 수준'
          : deviation <= 50        ? '섹터 평균 대비 고평가'
          : '섹터 평균 대비 크게 고평가';

        return (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              섹터별 EV/EBIT 비교 <span className="text-gray-600 font-normal normal-case">({sector})</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 text-xs mb-1">섹터 중앙값</p>
                <p className="text-white text-lg font-bold tabular-nums">
                  {sectorData.median.toFixed(1)}
                  <span className="text-gray-500 text-sm font-normal">x</span>
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-1">섹터 평균</p>
                <p className="text-gray-300 text-lg font-semibold tabular-nums">
                  {sectorData.mean.toFixed(1)}
                  <span className="text-gray-500 text-sm font-normal">x</span>
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-1">이 종목 EV/EBIT</p>
                <p className={`text-lg font-bold tabular-nums ${stockEV != null ? 'text-blue-400' : 'text-gray-600'}`}>
                  {stockEV != null ? `${stockEV.toFixed(1)}x` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-1">섹터 중앙 대비</p>
                <p className={`text-lg font-bold tabular-nums ${deviationColor}`}>
                  {deviation != null ? `${deviation > 0 ? '+' : ''}${deviation.toFixed(0)}%` : '—'}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <p className={`text-sm font-medium ${deviationColor}`}>{deviationLabel}</p>
              <p className="text-gray-600 text-xs mt-0.5">
                섹터 내 {sectorData.sampleSize}개 종목 기준
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
