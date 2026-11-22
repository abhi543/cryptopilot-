"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { OHLCV } from "@/types";
import { api } from "@/services/api";

interface TradingViewChartProps {
  symbol?: string;
  timeframe?: string;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol = "BTC/USDT",
  timeframe = "1h",
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!chartContainerRef.current) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#121721" },
        textColor: "#94a3b8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e2638" },
        horzLines: { color: "#1e2638" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
      timeScale: {
        borderColor: "#1e2638",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#1e2638",
      },
      crosshair: {
        vertLine: { color: "#6366f1", width: 1, style: 2 },
        horzLine: { color: "#6366f1", width: 1, style: 2 },
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Responsive resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    // Fetch Initial OHLCV Data
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data: OHLCV[] = await api.getOHLCV(symbol, timeframe, 80);
        if (!isMounted) return;

        // Transform OHLCV to Lightweight Charts format (time in unix seconds)
        const formatted = data.map((d) => ({
          time: Math.floor(d.timestamp / 1000) as any,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));

        candlestickSeries.setData(formatted);
        chart.timeScale().fitContent();
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load market chart");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, timeframe]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-crypto-border bg-crypto-card">
      <div className="px-5 py-3 border-b border-crypto-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-100 text-sm">{symbol}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-400 font-medium">
            {timeframe}
          </span>
          <span className="text-xs text-crypto-muted">TradingView Lightweight Chart</span>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-crypto-card/60 z-10 backdrop-blur-xs">
          <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-indigo-500" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-crypto-card/90 z-10 p-4 text-center">
          <p className="text-rose-400 text-xs">{error}</p>
        </div>
      )}

      <div ref={chartContainerRef} className="w-full" style={{ minHeight: "380px" }} />
    </div>
  );
};
