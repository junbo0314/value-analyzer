'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import type { SearchResult } from '@/app/api/search/route';

export default function NavSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((ticker: string) => {
    const t = ticker.trim();
    if (!t) return;
    setOpen(false);
    setQuery('');
    setSuggestions([]);
    setShowDrop(false);
    router.push(`/analyze/${encodeURIComponent(t.toUpperCase())}`);
  }, [router]);

  // Open → focus input
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); setShowDrop(false); return; }
    if (!showDrop || suggestions.length === 0) {
      if (e.key === 'Enter') go(query);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0) { go(suggestions[activeIdx].symbol); } else { go(suggestions[0].symbol); } }
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Collapsed: icon button */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg px-3 py-1.5 text-sm transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:block">종목 검색</span>
        </button>
      ) : (
        /* Expanded: input */
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 animate-spin" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="티커 또는 기업명…"
              autoComplete="off"
              className="w-56 sm:w-72 bg-gray-900 border border-gray-600 focus:border-blue-500 rounded-lg pl-9 pr-8 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            onClick={() => { setOpen(false); setQuery(''); setShowDrop(false); }}
            className="text-gray-500 hover:text-gray-300 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && showDrop && suggestions.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl shadow-black/60 z-50">
          {suggestions.map((s, i) => (
            <button
              key={s.symbol}
              type="button"
              onMouseDown={e => { e.preventDefault(); go(s.symbol); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={[
                'w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors',
                i === activeIdx ? 'bg-blue-600/20' : 'hover:bg-gray-800',
                i !== 0 ? 'border-t border-gray-800' : '',
              ].join(' ')}
            >
              <span className="font-mono text-sm font-bold text-white w-24 shrink-0">{s.symbol}</span>
              <span className="text-gray-300 text-sm truncate flex-1">{s.name}</span>
              {s.exchange && <span className="text-xs text-gray-600 shrink-0">{s.exchange}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
