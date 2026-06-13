'use client';

import { AISignal, StockData } from '@/types';
import { calculateEVtoEBIT } from '@/lib/calculations';
import { TrendingUp, AlertTriangle, Activity, Dot } from 'lucide-react';

interface Props {
  signals: AISignal[];
  stockData: StockData;
}

export default function AIReportSection({ signals, stockData }: Props) {
  const positives = signals.filter((s) => s.type === 'positive');
  const warnings = signals.filter((s) => s.type === 'warning');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Positives */}
        <SignalGroup
          icon={<TrendingUp className="w-4 h-4 text-green-400" />}
          title="긍정 신호"
          count={positives.length}
          titleColor="text-green-400"
          signals={positives}
          emptyMsg="뚜렷한 긍정 신호가 없습니다."
        />

        {/* Warnings */}
        <SignalGroup
          icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
          title="주의 신호"
          count={warnings.length}
          titleColor="text-yellow-400"
          signals={warnings}
          emptyMsg="주요 위험 신호가 감지되지 않았습니다."
        />
      </div>

      {/* Summary metrics */}
      {(() => {
        const evEbit = calculateEVtoEBIT(stockData);
        const evEbitStr = evEbit !== null ? `${evEbit.toFixed(1)}x` : 'N/A';
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: '현재 주가', value: fmtPrice(stockData.currentPrice, stockData.currency) },
              { label: 'Forward EPS', value: stockData.forwardEPS !== 0 ? fmtPrice(stockData.forwardEPS, stockData.currency) : 'N/A' },
              { label: '총이익률', value: stockData.grossMargin > 0 ? `${(stockData.grossMargin * 100).toFixed(1)}%` : 'N/A' },
              { label: '영업이익률', value: stockData.operatingMargin !== 0 ? `${(stockData.operatingMargin * 100).toFixed(1)}%` : 'N/A' },
              { label: 'ROE', value: stockData.returnOnEquity !== 0 ? `${(stockData.returnOnEquity * 100).toFixed(1)}%` : 'N/A' },
              { label: '부채비율', value: stockData.debtRatio > 0 ? `${(stockData.debtRatio * 100).toFixed(0)}%` : 'N/A' },
              { label: 'EV/EBIT', value: evEbitStr },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                <p className="text-gray-600 text-xs mb-1">{label}</p>
                <p className="text-white text-sm font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Disclaimer */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-start gap-2">
        <Activity className="w-4 h-4 text-gray-600 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="text-gray-400 font-semibold">면책 조항: </span>
          이 분석은 Yahoo Finance 공개 데이터와 Graham-Dodd 수정 공식을 기반으로 합니다.
          투자 결정의 참고 자료로만 활용하시고, 전문 투자 조언을 대체하지 않습니다.
          내재가치 계산에 사용된 성장률·PER 배수·부채 패널티는 미래 불확실성을 충분히 반영하지 못할 수 있습니다.
          실제 투자 전 사업 모델, 경쟁 환경, 거시 경제 상황을 종합적으로 검토하세요.
        </p>
      </div>
    </div>
  );
}

function SignalGroup({
  icon,
  title,
  count,
  titleColor,
  signals,
  emptyMsg,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  titleColor: string;
  signals: AISignal[];
  emptyMsg: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${titleColor}`}>
          {title}
        </h3>
        <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">{count}</span>
      </div>
      {signals.length > 0 ? (
        <div className="space-y-3">
          {signals.map((s, i) => (
            <SignalCard key={i} signal={s} />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-600 text-sm flex items-center gap-2">
          <Dot className="w-4 h-4" />
          {emptyMsg}
        </div>
      )}
    </div>
  );
}

function SignalCard({ signal }: { signal: AISignal }) {
  const isPos = signal.type === 'positive';
  return (
    <div
      className={`rounded-xl p-4 border ${
        isPos
          ? 'bg-green-950/30 border-green-700/30'
          : 'bg-yellow-950/30 border-yellow-700/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className={`text-sm font-semibold leading-snug ${isPos ? 'text-green-300' : 'text-yellow-300'}`}>
          {signal.title}
        </h4>
        {signal.metric && signal.value && (
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ${
              isPos ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
            }`}
          >
            {signal.value}
          </span>
        )}
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">{signal.description}</p>
    </div>
  );
}

function fmtPrice(v: number, currency: string): string {
  if (currency === 'KRW') return `₩${Math.round(v).toLocaleString('ko-KR')}`;
  return v >= 1000 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`;
}
