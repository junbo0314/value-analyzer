'use client';

import { StockData } from '@/types';
import { Building2, Tag } from 'lucide-react';

interface Props {
  data: StockData;
  aaaRate: number;
  rateSource?: string;
}

export default function CompanyHeader({ data, aaaRate, rateSource }: Props) {
  const isCurrencyKRW = data.currency === 'KRW';

  const fmtPrice = (v: number) =>
    isCurrencyKRW
      ? `₩${Math.round(v).toLocaleString('ko-KR')}`
      : `$${v >= 1000 ? v.toFixed(0) : v.toFixed(2)}`;

  const fmtEPS = (v: number) =>
    isCurrencyKRW
      ? `₩${Math.round(v).toLocaleString('ko-KR')}`
      : `$${v.toFixed(2)}`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        {/* Company info */}
        <div>
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span className="font-mono text-2xl font-bold text-white">{data.ticker}</span>
            {data.exchange && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">
                {data.exchange}
              </span>
            )}
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">
              {data.currency}
            </span>
          </div>
          <p className="text-gray-300 text-lg font-medium mb-2">{data.companyName}</p>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {data.sector && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {data.sector}
              </span>
            )}
            {data.industry && (
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                {data.industry}
              </span>
            )}
          </div>
        </div>

        {/* Key prices */}
        <div className="flex gap-6 shrink-0">
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-1">현재 주가</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {fmtPrice(data.currentPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-1">Forward EPS</p>
            <p className="text-xl font-semibold text-blue-400 tabular-nums">
              {data.forwardEPS !== 0 ? fmtEPS(data.forwardEPS) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-1">AAA 금리 (Y)</p>
            <p className="text-xl font-semibold text-yellow-400 tabular-nums">
              {aaaRate.toFixed(2)}%
            </p>
            {rateSource && (
              <p className="text-gray-600 text-xs">{rateSource}</p>
            )}
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="mt-5 pt-5 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-3">
        <Metric label="TTM EPS" value={data.ttmEPS !== 0 ? fmtEPS(data.ttmEPS) : '—'} />
        <Metric
          label="매출 성장률"
          value={data.revenueGrowth !== 0 ? `${(data.revenueGrowth * 100).toFixed(1)}%` : '—'}
          positive={data.revenueGrowth > 0.05}
          negative={data.revenueGrowth < 0}
        />
        <Metric
          label="매출총이익률"
          value={data.grossMargin > 0 ? `${(data.grossMargin * 100).toFixed(1)}%` : '—'}
          positive={data.grossMargin > 0.4}
          negative={data.grossMargin < 0.1}
        />
        <Metric
          label="영업이익률"
          value={data.operatingMargin !== 0 ? `${(data.operatingMargin * 100).toFixed(1)}%` : '—'}
          positive={data.operatingMargin > 0.2}
          negative={data.operatingMargin < 0}
        />
        <Metric
          label="ROE"
          value={data.returnOnEquity !== 0 ? `${(data.returnOnEquity * 100).toFixed(1)}%` : '—'}
          positive={data.returnOnEquity > 0.15}
          negative={data.returnOnEquity < 0}
        />
        <Metric
          label="부채비율"
          value={data.debtRatio > 0 ? `${(data.debtRatio * 100).toFixed(0)}%` : '—'}
          positive={data.debtRatio < 0.25}
          negative={data.debtRatio > 0.6}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const color = positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-gray-300';
  return (
    <div>
      <p className="text-gray-600 text-xs mb-0.5">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
