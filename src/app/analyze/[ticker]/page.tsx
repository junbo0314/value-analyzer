'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

import { StockData, MarketGrade, GRADE_CONFIGS } from '@/types';
import { calculateIV, getDefaultCP, getDefaultDF, getROEFactor } from '@/lib/calculations';
import { generateAISignals } from '@/lib/aiSignals';

import CompanyHeader from '@/components/CompanyHeader';
import NavSearch from '@/components/NavSearch';
import MarketGradeSelector from '@/components/MarketGradeSelector';
import VariablePanel from '@/components/VariablePanel';
import IntrinsicValueCard from '@/components/IntrinsicValueCard';
import MarketContextCard from '@/components/MarketContextCard';
import FormulaBreakdown from '@/components/FormulaBreakdown';
import AIReportSection from '@/components/AIReportSection';

export default function AnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const rawTicker = Array.isArray(params.ticker) ? params.ticker[0] : params.ticker ?? '';
  const ticker = decodeURIComponent(rawTicker).toUpperCase();

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [aaaRate, setAaaRate] = useState<number>(4.5);
  const [rateSource, setRateSource] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User-adjustable parameters
  const [selectedGrade, setSelectedGrade] = useState<MarketGrade | null>(null);
  const [g, setG] = useState<number>(10);
  const [cp, setCp] = useState<number>(1.0);
  const [df, setDf] = useState<number>(1.0);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [dataRes, rateRes] = await Promise.all([
          fetch(`/api/analyze?ticker=${encodeURIComponent(ticker)}`),
          fetch('/api/aaa-rate'),
        ]);

        if (!dataRes.ok) {
          const body = await dataRes.json().catch(() => ({}));
          throw new Error(body.error ?? '데이터를 불러오지 못했습니다.');
        }

        const data: StockData = await dataRes.json();
        const rateData = await rateRes.json().catch(() => ({ rate: 4.5 }));

        setStockData(data);
        setAaaRate(rateData.rate ?? 4.5);
        setRateSource(rateData.source ?? '');

        // Derive sensible defaults from fetched data
        // EPS CAGR preferred; fall back to revenue growth
        const rawG = data.epsCAGR ?? data.revenueGrowth * 100;
        setG(Math.min(Math.max(Math.round(rawG * 2) / 2, -10), 40));
        setCp(getDefaultCP(data.grossMargin));
        setDf(getDefaultDF(data.debtRatio));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [ticker]);

  const ivResult = useMemo(() => {
    if (!stockData || selectedGrade === null) return null;
    const cfg = GRADE_CONFIGS.find((c) => c.grade === selectedGrade)!;
    const eps = stockData.forwardEPS !== 0 ? stockData.forwardEPS : stockData.ttmEPS;
    const roeFactor = stockData.returnOnEquity > 0
      ? getROEFactor(stockData.returnOnEquity)
      : 1.00;
    return calculateIV(
      {
        eps,
        basePER: cfg.basePER,
        gMultiplier: cfg.gMultiplier,
        g,
        cp,
        roeFactor,
        y: aaaRate,
        df,
        netCashPerShare: stockData.netCashPerShare,
      },
      stockData.currentPrice
    );
  }, [stockData, selectedGrade, g, cp, df, aaaRate]);

  const aiSignals = useMemo(
    () => (stockData ? generateAISignals(stockData) : []),
    [stockData]
  );

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">{ticker}</p>
          <p className="text-gray-500 text-sm mt-1">Yahoo Finance에서 데이터 불러오는 중…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !stockData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">데이터 로드 실패</h2>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> 다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ──
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            홈
          </button>
          <span className="text-gray-700">/</span>
          <span className="font-mono text-white font-semibold">{ticker}</span>
          <span className="text-gray-500 text-sm hidden sm:block">{stockData.companyName}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:flex items-center gap-1">
              AAA <span className="text-yellow-400 font-mono font-semibold">{aaaRate.toFixed(2)}%</span>
            </span>
            <NavSearch />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Company header */}
        <CompanyHeader data={stockData} aaaRate={aaaRate} rateSource={rateSource} />

        {/* Step 1: Grade */}
        <section>
          <SectionTitle step={1} title="시장 지위 등급 선택" />
          <MarketGradeSelector selectedGrade={selectedGrade} onSelect={setSelectedGrade} ticker={ticker} />
        </section>

        {/* Steps 2 & 3: Variables + Result (shown only after grade selected) */}
        {selectedGrade !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <SectionTitle step={2} title="변수 조정" />
              <VariablePanel
                g={g}
                setG={setG}
                cp={cp}
                setCp={setCp}
                df={df}
                setDf={setDf}
                aaaRate={aaaRate}
                stockData={stockData}
                selectedGrade={selectedGrade}
              />
            </div>

            <div className="lg:col-span-2 space-y-4">
              <SectionTitle step={3} title="내재가치 분석 결과" />
              {ivResult ? (
                <>
                  <IntrinsicValueCard result={ivResult} stockData={stockData} />
                  <MarketContextCard
                    currentIVtoPrice={ivResult.iv / ivResult.currentPrice}
                    stockData={stockData}
                  />
                  <FormulaBreakdown result={ivResult} selectedGrade={selectedGrade} />
                </>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                  등급을 선택하면 내재가치가 계산됩니다.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prompt to select grade */}
        {selectedGrade === null && (
          <div className="bg-gray-900/50 border border-dashed border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">
              위에서 시장 지위 등급을 선택하면 내재가치 계산 및 변수 조정 패널이 표시됩니다.
            </p>
          </div>
        )}

        {/* AI Report */}
        <section>
          <SectionTitle step={null} title="AI 재무 분석 리포트" />
          <AIReportSection signals={aiSignals} stockData={stockData} />
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ step, title }: { step: number | null; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {step !== null && (
        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
          Step {step}
        </span>
      )}
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  );
}
