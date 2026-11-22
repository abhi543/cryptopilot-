"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TradingViewChart } from "@/components/dashboard/TradingViewChart";
import { StrategyCard } from "@/components/dashboard/StrategyCard";
import { RecentTradesTable } from "@/components/dashboard/RecentTradesTable";
import { PositionsTable } from "@/components/dashboard/PositionsTable";
import { SignalFeed } from "@/components/dashboard/SignalFeed";
import { NewStrategyModal } from "@/components/dashboard/NewStrategyModal";
import { AddPairModal } from "@/components/dashboard/AddPairModal";
import { Card } from "@/components/common/Card";
import { Strategy, Trade, Signal, PortfolioSummary, Ticker, Position } from "@/types";
import { api } from "@/services/api";
import { liveFeed } from "@/services/websocket";
import {
  Wallet,
  Activity,
  DollarSign,
  Layers,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Coins,
  History,
  Plus,
  Trash2,
  Play,
  Pause,
} from "lucide-react";

export default function DashboardPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [monitoredPairs, setMonitoredPairs] = useState<string[]>([
    "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT"
  ]);
  const [popularPairs, setPopularPairs] = useState<{ symbol: string; name: string }[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USDT");
  const [activeBottomTab, setActiveBottomTab] = useState<"positions" | "trades">("positions");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddPairOpen, setIsAddPairOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAutoTrading, setIsAutoTrading] = useState(true);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [strats, trds, pos, sigs, summ, tcks, pairsData, autoStatus] = await Promise.allSettled([
        api.listStrategies(),
        api.listTrades(20),
        api.getPositions(),
        api.listSignals(15),
        api.getPortfolioSummary(),
        api.getTickers(),
        api.getTradingPairs(),
        api.getAutoTradingStatus(),
      ]);

      if (strats.status === "fulfilled") setStrategies(strats.value);
      if (trds.status === "fulfilled") setTrades(trds.value);
      if (pos.status === "fulfilled") setPositions(pos.value);
      if (sigs.status === "fulfilled") setSignals(sigs.value);
      if (summ.status === "fulfilled") setSummary(summ.value);
      if (tcks.status === "fulfilled") setTickers(tcks.value);
      if (pairsData.status === "fulfilled") {
        setMonitoredPairs(pairsData.value.monitored);
        setPopularPairs(pairsData.value.popular);
      }
      if (autoStatus.status === "fulfilled") {
        setIsAutoTrading(autoStatus.value.enabled);
      }
    } catch (err) {
      console.warn("Dashboard data load warning:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoTrading = async () => {
    try {
      const res = await api.toggleAutoTrading();
      setIsAutoTrading(res.enabled);
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAllData();

    // Auto-refresh interval (ensures live, up-to-the-second data in serverless & web deployments)
    const pollInterval = setInterval(() => {
      Promise.allSettled([
        api.getTickers(),
        api.getPortfolioSummary(),
        api.getPositions(),
        api.listTrades(20),
        api.listSignals(15),
      ]).then(([tcks, summ, pos, trds, sigs]) => {
        if (tcks.status === "fulfilled") setTickers(tcks.value);
        if (summ.status === "fulfilled") setSummary(summ.value);
        if (pos.status === "fulfilled") setPositions(pos.value);
        if (trds.status === "fulfilled") setTrades(trds.value);
        if (sigs.status === "fulfilled") setSignals(sigs.value);
      });
    }, 3000);

    // Listen for live ticker updates over WebSocket
    const unsubTickers = liveFeed.on("TICKER_UPDATE", (incomingTickers: Ticker[]) => {
      setTickers(incomingTickers);
      api.getPositions().then(setPositions).catch(() => {});
    });

    // Listen for autonomous trade executions
    const unsubTrades = liveFeed.on("TRADE_EXECUTED", (newTrade: Trade) => {
      setTrades((prev) => [newTrade, ...prev.slice(0, 24)]);
      api.getPortfolioSummary().then(setSummary).catch(() => {});
      api.getPositions().then(setPositions).catch(() => {});
    });

    return () => {
      clearInterval(pollInterval);
      unsubTickers();
      unsubTrades();
    };
  }, []);

  const handleStatusChange = async (id: string, action: "activate" | "pause" | "stop") => {
    try {
      await api.updateStrategyStatus(id, action);
      await loadAllData();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleClosePosition = async (symbol: string) => {
    try {
      await api.closePosition(symbol);
      await loadAllData();
    } catch (err: any) {
      alert(`Close position failed: ${err.message}`);
    }
  };

  const handleRemovePair = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    if (monitoredPairs.length <= 1) {
      alert("You must keep at least one trading pair active.");
      return;
    }
    if (!confirm(`Remove ${symbol} from monitored pairs?`)) return;

    try {
      await api.removeTradingPair(symbol);
      if (selectedSymbol === symbol) {
        const next = monitoredPairs.find((p) => p !== symbol) || "BTC/USDT";
        setSelectedSymbol(next);
      }
      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Failed to remove pair");
    }
  };

  const activeStrategiesCount = strategies.filter((s) => s.status === "active").length;
  const cashBalance = summary?.cash_balance ?? summary?.paper_balances?.["USDT"] ?? 50000;
  const totalEquity = summary?.total_equity ?? (cashBalance + positions.reduce((acc, p) => acc + p.position_value, 0));
  const totalUnrealizedPnl = summary?.total_unrealized_pnl ?? positions.reduce((acc, p) => acc + p.unrealized_pnl, 0);

  return (
    <div className="flex-1 flex flex-col bg-crypto-dark min-h-screen">
      <Header
        onOpenNewStrategy={() => setIsModalOpen(true)}
        paperBalance={totalEquity}
      />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Ticker Bar (Dynamic Pairs + Add Pair Button) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monitored Binance Markets ({monitoredPairs.length})
            </span>
            <button
              onClick={() => setIsAddPairOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Daily New Pair
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {monitoredPairs.map((sym) => {
              const t = tickers.find((item) => item.symbol === sym);
              const isSelected = selectedSymbol === sym;
              const price = t ? t.last_price : 0.0;
              const change = t ? t.percentage_24h : 0.0;

              return (
                <div
                  key={sym}
                  onClick={() => setSelectedSymbol(sym)}
                  className={`group relative p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10"
                      : "bg-crypto-card border-crypto-border hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-200">{sym}</span>
                    <button
                      onClick={(e) => handleRemovePair(e, sym)}
                      title="Remove pair"
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="mt-2">
                    <span className="text-sm font-bold font-mono text-slate-100 block">
                      {price > 0 ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: price < 1 ? 4 : 2 })}` : "Connecting..."}
                    </span>
                    <span
                      className={`text-[11px] font-semibold block ${
                        change >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Card */}
            <button
              onClick={() => setIsAddPairOpen(true)}
              className="p-3 rounded-xl border border-dashed border-crypto-border/80 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-indigo-600/5 flex flex-col items-center justify-center text-center text-slate-400 hover:text-indigo-400 transition-all gap-1"
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs font-medium">+ Add Pair</span>
            </button>
          </div>
        </div>

        {/* Futures Portfolio Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Futures Equity"
            value={`$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Wallet Balance + Unrealized PnL"
            icon={Wallet}
          />
          <MetricCard
            title="Available Margin"
            value={`$${(summary?.available_margin ?? cashBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Ready to Open Positions"
            icon={DollarSign}
            badge="FREE"
          />
          <MetricCard
            title="Active Margin Locked"
            value={`$${(summary?.margin_used ?? positions.reduce((acc, p) => acc + (p.margin || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={`${positions.length} active position${positions.length === 1 ? "" : "s"}`}
            icon={Coins}
            badge="FUTURES"
          />
          <MetricCard
            title="Unrealized PnL"
            value={`${totalUnrealizedPnl >= 0 ? "+$" : "-$"}${Math.abs(totalUnrealizedPnl).toFixed(2)}`}
            subtitle="Mark-to-Market ROE"
            change={totalEquity > 0 ? Number(((totalUnrealizedPnl / totalEquity) * 100).toFixed(2)) : 0}
            icon={Activity}
          />
        </div>

        {/* Chart + Live Signals Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TradingViewChart symbol={selectedSymbol} timeframe="1h" />
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-crypto-border mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-100">Live Strategy Signals</h3>
                </div>
                <button
                  onClick={loadAllData}
                  className="p-1 rounded text-slate-400 hover:text-slate-200"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1">
                <SignalFeed initialSignals={signals} />
              </div>
            </Card>
          </div>
        </div>

        {/* Strategies Fleet Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-crypto-card border border-crypto-border p-4 rounded-xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-slate-100">Strategy Fleet</h2>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isAutoTrading
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {isAutoTrading ? "● MASTER BOT: ACTIVE" : "○ MASTER BOT: STOPPED"}
                </span>
              </div>
              <p className="text-xs text-crypto-muted">
                Active automated quantitative engines running on Bybit V5 live feed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAutoTrading}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  isAutoTrading
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                }`}
              >
                {isAutoTrading ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoTrading ? "STOP MASTER BOT" : "START MASTER BOT"}</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm shadow-indigo-600/30 cursor-pointer"
              >
                + Add Strategy
              </button>
            </div>
          </div>

          {strategies.length === 0 ? (
            <Card className="p-8 text-center">
              <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No Strategies Configured</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Deploy your first Grid Trading, Trend Following, or Breakout strategy instance to begin generating automated 24/7 executions.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Deploy Strategy Engine
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategies.map((strat) => (
                <StrategyCard
                  key={strat.id}
                  strategy={strat}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bottom Section: Active Positions & Executed Trades Tabs */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-crypto-border pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveBottomTab("positions")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeBottomTab === "positions"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Active Positions ({positions.length})</span>
              </button>
              <button
                onClick={() => setActiveBottomTab("trades")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeBottomTab === "trades"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Trade History ({trades.length})</span>
              </button>
            </div>

            <span className="text-xs text-crypto-muted">CCXT Paper Engine</span>
          </div>

          <Card className="p-0 overflow-hidden">
            {activeBottomTab === "positions" ? (
              <PositionsTable positions={positions} onClosePosition={handleClosePosition} />
            ) : (
              <RecentTradesTable trades={trades} />
            )}
          </Card>
        </section>
      </main>

      {/* Deploy Strategy Modal */}
      <NewStrategyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadAllData}
      />

      {/* Add New Pair Modal */}
      <AddPairModal
        isOpen={isAddPairOpen}
        onClose={() => setIsAddPairOpen(false)}
        onPairAdded={loadAllData}
        monitoredPairs={monitoredPairs}
        popularPairs={popularPairs}
      />
    </div>
  );
}
