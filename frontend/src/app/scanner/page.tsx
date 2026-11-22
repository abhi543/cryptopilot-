"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { AddPairModal } from "@/components/dashboard/AddPairModal";
import { api } from "@/services/api";
import { MarketScanItem, MarketScanResponse, ScannerTimeframe } from "@/types";
import {
  Radar,
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  Radio,
  Zap,
  ShieldCheck,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

const TIMEFRAMES: ScannerTimeframe[] = ["5m", "15m", "1h", "4h", "1d"];

type FilterTab = "all" | "gainers" | "losers" | "high_vol";
type SortField = "symbol" | "price" | "percentage_24h" | "timeframe_change_pct" | "volume_24h";

export default function MarketScannerPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<ScannerTimeframe>("1h");
  const [scanData, setScanData] = useState<MarketScanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortField, setSortField] = useState<SortField>("volume_24h");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchScanData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await api.getMarketScan(selectedTimeframe);
      setScanData(res);
      setActionError(null);
    } catch (err: any) {
      console.warn("Market scan fetch warning:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScanData();
    const interval = setInterval(() => {
      fetchScanData();
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const handleRemovePair = async (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove ${symbol} from the scanner?`)) return;
    try {
      await api.removeScannerPair(symbol);
      fetchScanData(true);
    } catch (err: any) {
      setActionError(err.message || "Failed to remove pair");
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    if (!scanData?.items) return [];

    let list = scanData.items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterTab === "gainers") return item.percentage_24h > 0;
      if (filterTab === "losers") return item.percentage_24h < 0;
      if (filterTab === "high_vol") return item.volume_24h > 10000000;
      return true;
    });

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [scanData, searchQuery, filterTab, sortField, sortAsc]);

  const formatCurrency = (val: number) => {
    if (val >= 1000) {
      return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${val.toFixed(val < 1 ? 4 : 2)}`;
  };

  const formatVolume = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-crypto-dark">
      <Header />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Banner / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-crypto-border p-5 rounded-2xl backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Radar className="w-4 h-4 animate-pulse" />
              <span>Phase 2 Engine: CCXT Market Scanner</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Live Cryptocurrency Scanner</h1>
            <p className="text-xs text-crypto-muted mt-1">
              Streaming real Binance spot orderbooks and multi-timeframe OHLCV candles without synthetic mock data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-semibold uppercase tracking-wider">
                {scanData?.connection_status || "Live CCXT/WebSocket"}
              </span>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trading Pair</span>
            </button>

            <button
              onClick={() => fetchScanData(true)}
              disabled={refreshing}
              className="p-2 rounded-lg border border-crypto-border hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Refresh Scanner"
            >
              <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin text-indigo-400")} />
            </button>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Controls: Timeframes, Search, Filter Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-crypto-border p-1 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 px-2.5 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" /> TF:
            </span>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  selectedTimeframe === tf
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 border border-crypto-border p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterTab("all")}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer",
                filterTab === "all" ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"
              )}
            >
              All Pairs ({scanData?.monitored_count || 0})
            </button>
            <button
              onClick={() => setFilterTab("gainers")}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1",
                filterTab === "gainers" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-emerald-400"
              )}
            >
              <TrendingUp className="w-3 h-3" /> Gainers
            </button>
            <button
              onClick={() => setFilterTab("losers")}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1",
                filterTab === "losers" ? "bg-rose-500/20 text-rose-400" : "text-slate-400 hover:text-rose-400"
              )}
            >
              <TrendingDown className="w-3 h-3" /> Losers
            </button>
            <button
              onClick={() => setFilterTab("high_vol")}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1",
                filterTab === "high_vol" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:text-indigo-400"
              )}
            >
              <BarChart3 className="w-3 h-3" /> High Volume (&gt;$10M)
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol (e.g. BTC)..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-crypto-border rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Live Market Table */}
        <div className="rounded-2xl border border-crypto-border bg-crypto-card overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-crypto-border bg-slate-900/60 text-slate-400 uppercase font-semibold text-[11px] tracking-wider select-none">
                  <th
                    onClick={() => handleSort("symbol")}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cryptocurrency</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("price")}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Live Price</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("percentage_24h")}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>24h Change</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("timeframe_change_pct")}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{selectedTimeframe} Change</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    <span>24h High / Low</span>
                  </th>
                  <th
                    onClick={() => handleSort("volume_24h")}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>24h Volume</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Trend Indicator</th>
                  <th className="py-3.5 px-4 text-center">Feed Source</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crypto-border/50">
                {loading && !scanData ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
                        <span>Connecting to CCXT & Binance Market Stream...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      No cryptocurrency pairs matched your search/filter.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedItems.map((item) => {
                    const isPositive24 = item.percentage_24h >= 0;
                    const isPositiveTF = item.timeframe_change_pct >= 0;

                    return (
                      <tr
                        key={item.symbol}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Cryptocurrency Name & Symbol */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs">
                              {item.symbol.split("/")[0].slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                <span>{item.symbol}</span>
                              </div>
                              <div className="text-[11px] text-crypto-muted">{item.name}</div>
                            </div>
                          </div>
                        </td>

                        {/* Current Price */}
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-100">
                          {formatCurrency(item.price)}
                        </td>

                        {/* 24h Change */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 font-semibold font-mono px-2 py-0.5 rounded text-[11px]",
                              isPositive24
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            )}
                          >
                            {isPositive24 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {isPositive24 ? "+" : ""}
                            {item.percentage_24h.toFixed(2)}%
                          </span>
                        </td>

                        {/* Selected Timeframe Change */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={clsx(
                              "inline-flex items-center gap-0.5 font-mono text-[11px]",
                              isPositiveTF ? "text-emerald-400" : "text-rose-400"
                            )}
                          >
                            {isPositiveTF ? "+" : ""}
                            {item.timeframe_change_pct.toFixed(2)}%
                          </span>
                        </td>

                        {/* 24h High / Low */}
                        <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                          <div>H: {formatCurrency(item.high_24h)}</div>
                          <div className="text-slate-500">L: {formatCurrency(item.low_24h)}</div>
                        </td>

                        {/* 24h Volume */}
                        <td className="py-3 px-4 text-right font-mono text-slate-300 font-medium">
                          {formatVolume(item.volume_24h)}
                        </td>

                        {/* Market Trend Indicator */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border",
                              item.trend_indicator === "BULLISH" &&
                                "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                              item.trend_indicator === "BEARISH" &&
                                "bg-rose-500/15 text-rose-400 border-rose-500/30",
                              item.trend_indicator === "NEUTRAL" &&
                                "bg-slate-700/30 text-slate-400 border-slate-700"
                            )}
                          >
                            {item.trend_indicator === "BULLISH" && <TrendingUp className="w-3 h-3" />}
                            {item.trend_indicator === "BEARISH" && <TrendingDown className="w-3 h-3" />}
                            {item.trend_indicator === "NEUTRAL" && <Minus className="w-3 h-3" />}
                            <span>{item.trend_indicator}</span>
                          </span>
                        </td>

                        {/* Feed Source */}
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-crypto-border text-slate-400">
                            {item.feed_source === "LIVE_WEBSOCKET" ? "WS LIVE" : "REST"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => handleRemovePair(item.symbol, e)}
                            title="Remove pair from scanner"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar: Last Update & Policy */}
          <div className="p-4 border-t border-crypto-border bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-crypto-muted">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Last Update:{" "}
                <span className="text-slate-300 font-mono">
                  {scanData?.last_successful_update || "Connecting..."}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Mock Price Policy: Strict Live Market Feeds Only</span>
              </div>
              <div className="font-semibold text-slate-400">
                {filteredAndSortedItems.length} of {scanData?.monitored_count || 0} pairs shown
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Pair Modal */}
      <AddPairModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onPairAdded={() => fetchScanData(true)}
        monitoredPairs={scanData?.items.map((i) => i.symbol) || []}
      />
    </div>
  );
}
