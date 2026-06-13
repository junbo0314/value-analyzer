'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, BarChart2, TrendingUp, Info, Loader2 } from 'lucide-react';
import type { SearchResult } from './api/search/route';

const POPULAR = [
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'GOOGL', name: 'Alphabet' },
  { ticker: 'NVDA', name: 'NVIDIA' },
  { ticker: 'META', name: 'Meta' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'TSM', name: 'TSMC' },
  { ticker: 'BRKB', name: 'Berkshire' },
  { ticker: 'JPM', name: 'JPMorgan' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [navigating, setNavigating] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((ticker: string) => {
    const t = ticker.trim();
    if (!t) return;
    setNavigating(true);
    setShowDrop(false);
    router.push(`/analyze/${encodeURIComponent(t.toUpperCase())}`);
  }, [router]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) { setSuggestions([]); setShowDrop(false); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data: SearchResult[] = await res.json();
        setSuggestions(data);
        setShowDrop(data.length > 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDrop || suggestions.length === 0) {
      if (e.key === 'Enter') go(query);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) go(suggestions[activeIdx].symbol);
      else go(suggestions[0].symbol);
    } else if (e.key === 'Escape') {
      setShowDrop(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      go(suggestions[activeIdx].symbol);
    } else if (suggestions.length > 0) {
      go(suggestions[0].symbol);
    } else {
      go(query);
    }
  };

  return (
    <main className="relative min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
              <BarChart2 className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-blue-400 tracking-widest uppercase">
              Value Analyzer
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            기업 내재가치 분석
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Graham-Dodd 수정 공식으로 내재가치를 계산하고
            <br />
            현재 주가 대비 저평가·고평가 여부를 확인하세요.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDrop(true)}
            placeholder="티커 또는 기업명 입력  (예: AAPL · SK하이닉스 · 삼성전자)"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-12 pr-28 py-4 text-white placeholder-gray-600 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            autoFocus
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="absolute right-24 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
          )}
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={navigating}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer"
          >
            {navigating ? '로딩 중…' : '분석하기'}
          </button>

          {/* Autocomplete dropdown */}
          {showDrop && (
            <div
              ref={dropRef}
              className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50"
            >
              {suggestions.map((s, i) => (
                <button
                  key={s.symbol}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); go(s.symbol); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={[
                    'w-full text-left flex items-center gap-3 px-4 py-3 transition-colors',
                    i === activeIdx ? 'bg-blue-600/20' : 'hover:bg-gray-800',
                    i !== 0 ? 'border-t border-gray-800' : '',
                  ].join(' ')}
                >
                  <span className="font-mono text-sm font-bold text-white w-28 shrink-0">
                    {s.symbol}
                  </span>
                  <span className="text-gray-300 text-sm truncate flex-1">{s.name}</span>
                  {s.exchange && (
                    <span className="text-xs text-gray-600 shrink-0">{s.exchange}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Popular tickers */}
        <div className="mb-10">
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-3 text-center">
            인기 종목
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR.map(({ ticker, name }) => (
              <button
                key={ticker}
                type="button"
                onClick={() => go(ticker)}
                disabled={navigating}
                className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                <TrendingUp className="w-3 h-3 text-gray-600" />
                <span className="font-mono text-gray-200">{ticker}</span>
                <span className="text-gray-600 text-xs">·</span>
                <span className="text-gray-500">{name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formula card */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              내재가치 계산 공식
            </span>
          </div>
          <p className="font-mono text-sm text-blue-300 leading-relaxed">
            IV = ((EPS × [Base_PER + (g_Mult × g)] × CP × 4.0) / Y × DF)
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ Net_Cash_Per_Share
          </p>
          <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
            <span><span className="text-gray-400 font-mono">g</span> = 성장률 슬라이더</span>
            <span><span className="text-gray-400 font-mono">CP</span> = 가격전가력</span>
            <span><span className="text-gray-400 font-mono">DF</span> = 부채 페널티</span>
            <span><span className="text-gray-400 font-mono">Y</span> = AAA 금리 실시간</span>
            <span><span className="text-gray-400 font-mono">Base_PER</span> = 시장 지위 등급</span>
            <span><span className="text-gray-400 font-mono">EPS</span> = Forward / TTM</span>
          </div>
        </div>
      </div>
    </main>
  );
}
