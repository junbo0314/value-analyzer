'use client';

import { MarketGrade, GRADE_CONFIGS } from '@/types';
import { getMarketShare } from '@/lib/marketShare';
import { Check, Info, Sparkles } from 'lucide-react';

interface Props {
  selectedGrade: MarketGrade | null;
  onSelect: (grade: MarketGrade) => void;
  ticker?: string;
}

const GRADE_BADGES = ['👑', '🛡️', '⚔️', '⚠️'];

function ShareBar({ share }: { share: number }) {
  const pct = Math.min(share, 100);
  const color =
    pct >= 60 ? 'bg-yellow-400' :
    pct >= 30 ? 'bg-blue-400' :
    pct >= 10 ? 'bg-green-400' : 'bg-gray-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-white w-10 text-right shrink-0">
        {share}%
      </span>
    </div>
  );
}

export default function MarketGradeSelector({ selectedGrade, onSelect, ticker }: Props) {
  const msData = ticker ? getMarketShare(ticker) : null;

  return (
    <div className="space-y-4">
      {/* ── 해당 기업 시장 점유율 패널 ── */}
      {ticker && (
        <div className={[
          'rounded-xl border p-4',
          msData
            ? 'bg-gray-900 border-gray-700'
            : 'bg-gray-900/50 border-gray-800',
        ].join(' ')}>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm font-semibold text-white">
              {ticker} 글로벌 시장 점유율
            </span>
            {msData && (
              <span className="ml-auto text-xs text-gray-500">{msData.asOf}년 기준</span>
            )}
          </div>

          {msData ? (
            <>
              <div className="space-y-2.5 mb-3">
                {msData.segments.map((seg, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs text-gray-400">
                        {seg.market}
                        {seg.scope !== '글로벌' && (
                          <span className="ml-1 text-gray-600">({seg.scope})</span>
                        )}
                      </span>
                      {seg.note && (
                        <span className="text-xs text-gray-600 hidden sm:block">{seg.note}</span>
                      )}
                    </div>
                    <ShareBar share={seg.share} />
                  </div>
                ))}
              </div>

              {/* Suggested grade */}
              <div className="flex items-start gap-2 pt-3 border-t border-gray-800">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-yellow-300 font-medium mb-0.5">
                    추천 등급: {msData.suggestedGrade}등급 (
                    {GRADE_CONFIGS.find(c => c.grade === msData.suggestedGrade)?.name})
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">{msData.gradingReason}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500 leading-relaxed">
              이 기업의 시장 점유율 데이터가 준비되지 않았습니다.
              아래 등급 기준표를 참고해 직접 선택해주세요.
            </p>
          )}
        </div>
      )}

      {/* ── 등급 카드 그리드 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {GRADE_CONFIGS.map((cfg, idx) => {
          const isSelected = selectedGrade === cfg.grade;
          const isSuggested = msData?.suggestedGrade === cfg.grade;

          return (
            <button
              key={cfg.grade}
              onClick={() => onSelect(cfg.grade)}
              className={[
                'relative text-left p-5 rounded-xl border transition-all duration-200',
                `bg-gradient-to-br ${cfg.gradientClass}`,
                isSelected
                  ? `${cfg.borderClass} ring-2 ring-offset-2 ring-offset-gray-950 ${cfg.ringClass}`
                  : isSuggested
                  ? `${cfg.borderClass} border-opacity-70`
                  : 'border-gray-800 hover:border-gray-600',
              ].join(' ')}
            >
              {/* Selected check */}
              {isSelected && (
                <span className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full z-10">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}

              {/* Suggested badge */}
              {isSuggested && !isSelected && (
                <span className="absolute top-3 right-3 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-1.5 py-0.5 rounded-full font-medium">
                  추천
                </span>
              )}

              {/* Grade badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{GRADE_BADGES[idx]}</span>
                <span className="text-xs font-mono text-gray-500">{cfg.grade}등급</span>
              </div>

              <h3 className={`text-base font-bold mb-1 ${cfg.textAccentClass}`}>{cfg.name}</h3>
              <p className="text-gray-400 text-xs mb-3 leading-relaxed">{cfg.marketShareRange}</p>

              {/* PER params */}
              <div className="bg-gray-950/50 rounded-lg p-2.5 mb-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Base PER</span>
                  <span className="font-mono font-bold text-white">{cfg.basePER.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">g 승수</span>
                  <span className="font-mono font-bold text-white">{cfg.gMultiplier.toFixed(1)}×</span>
                </div>
              </div>

              {/* Examples */}
              <div className="mb-3">
                <p className="text-gray-600 text-xs mb-1.5">대표 기업</p>
                <div className="flex flex-wrap gap-1">
                  {cfg.examples.map((ex) => (
                    <span
                      key={ex}
                      className="text-xs bg-gray-800/80 text-gray-300 px-2 py-0.5 rounded"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{cfg.characteristics}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
