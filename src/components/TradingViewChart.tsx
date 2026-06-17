'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  ticker: string;    // e.g. "MSFT"
  exchange?: string; // TradingView-style, e.g. "NASDAQ", "NYSE"
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => void;
    };
  }
}

export default function TradingViewChart({ ticker, exchange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerId = `tv_chart_${ticker}`;
  const symbol = exchange ? `${exchange}:${ticker}` : ticker;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setIsLoading(true);
    container.innerHTML = '';

    const initWidget = () => {
      if (!window.TradingView || !containerRef.current) return;
      containerRef.current.innerHTML = '';
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: 'D',
        timezone: 'America/New_York',
        theme: 'dark',
        style: '1',
        locale: 'kr',
        toolbar_bg: '#111827',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: containerId,
      });
      setIsLoading(false);
    };

    if (window.TradingView) {
      initWidget();
      return () => {
        container.innerHTML = '';
      };
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = initWidget;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.remove();
      container.innerHTML = '';
    };
  }, [symbol, containerId]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="relative h-[500px] w-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <span className="text-gray-500 text-sm animate-pulse">차트 로딩 중...</span>
          </div>
        )}
        <div ref={containerRef} id={containerId} className="h-full w-full" />
      </div>
    </div>
  );
}
