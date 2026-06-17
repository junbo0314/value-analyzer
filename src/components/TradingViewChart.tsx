'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  ticker: string;    // e.g. "MSFT"
  exchange?: string; // TradingView-style, e.g. "NASDAQ", "NYSE"
}

export default function TradingViewChart({ ticker, exchange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const symbol = exchange ? `${exchange}:${ticker}` : ticker;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    setIsLoading(true);

    // TradingView Advanced Chart embed (현재 공식 권장 방식)
    // 설정 JSON을 script.text에 넣으면 TradingView가 document.currentScript에서 읽어옴
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'kr',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      allow_symbol_change: false,
      support_host: 'https://www.tradingview.com',
    });
    script.onload = () => setIsLoading(false);
    script.onerror = () => setIsLoading(false);
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="relative h-[500px] w-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <span className="text-gray-500 text-sm animate-pulse">차트 로딩 중...</span>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
