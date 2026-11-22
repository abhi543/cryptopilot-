"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { TradingViewChart } from "@/components/dashboard/TradingViewChart";
import { PositionsTable } from "@/components/dashboard/PositionsTable";
import { RecentTradesTable } from "@/components/dashboard/RecentTradesTable";
import { api } from "@/services/api";
import { Position, Trade, Ticker } from "@/types";
import {
  Crosshair,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wallet,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { clsx } from "clsx";

const QUICK_PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT"];

export default function ManualTradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("1h");
  const [ticker, setTicker] = useState<Ticker | null>(null);

  // Order form state
  const [positionSide, setPositionSide] = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage] = useState<number>(10);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amount, setAmount] = useState<string>("0.01");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string } | null>(null);

  // Manual positions and trades
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(10000);

  const fetchTickerAndPortfolio = async () => {
    try {
      const [tickers, summary, posList, tradeList] = await Promise.all([
        api.getTickers(selectedSymbol),
        api.getPortfolioSummary(),
        api.getPositions("manual"),
        api.listTrades(50),
      ]);

      if (tickers && tickers.length > 0) {
        setTicker(tickers[0]);
        if (!limitPrice) {
          setLimitPrice(tickers[0].last_price.toString());
        }
      }
      setCashBalance(summary.cash_balance ?? 10000);
      setPositions(posList.filter((p) => p.source === "manual" || !p.source));
      setTrades(tradeList.filter((t) => t.source === "manual"));
    } catch (err: any) {
      console.warn("Manual trading data refresh error:", err.message);
    }
  };

  useEffect(() => {
    fetchTickerAndPortfolio();
    const interval = setInterval(fetchTickerAndPortfolio, 3000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const handleQuickPercent = (pct: number) => {
    const currentPrice = ticker?.last_price || 60000;
    // Calculate position size using selected leverage and percentage of margin
    const marginToUse = cashBalance * (pct / 100);
    const notionalCapital = marginToUse * leverage;
    const calculatedAmount = notionalCapital / currentPrice;
    setAmount(calculatedAmount.toFixed(4));
  };

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setOrderResult({ success: false, message: "Please enter a valid positive contract amount." });
      return;
    }

    const price = orderType === "limit" ? parseFloat(limitPrice) : ticker?.last_price;
    if (orderType === "limit" && (isNaN(price as number) || (price as number) <= 0)) {
      setOrderResult({ success: false, message: "Please enter a valid limit price." });
      return;
    }

    setSubmitting(true);
    setOrderResult(null);

    try {
      const trade = await api.executeManualTrade({
        symbol: selectedSymbol,
        side: positionSide === "LONG" ? "BUY" : "SELL",
        position_side: positionSide,
        leverage,
        amount: numAmount,
        order_type: orderType,
        price,
      });

      setOrderResult({
        success: true,
        message: `Executed FUTURES ${positionSide} (${leverage}x) ${numAmount} ${selectedSymbol} at $${trade.price?.toLocaleString()}!`,
      });
      fetchTickerAndPortfolio();
    } catch (err: any) {
      setOrderResult({
        success: false,
        message: err.message || "Failed to execute futures order.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentPrice = ticker?.last_price || 0;
  const numAmount = parseFloat(amount) || 0;
  const executionPrice = orderType === "limit" ? parseFloat(limitPrice) || currentPrice : currentPrice;
  const notionalValue = numAmount * executionPrice;
  const marginRequired = leverage > 0 ? notionalValue / leverage : notionalValue;
  const estFee = notionalValue * 0.0005; // 0.05% standard futures taker fee

  // Liquidation price estimate
  const estLiqPrice = positionSide === "LONG"
    ? executionPrice * (1.0 - (1.0 / leverage) * 0.9)
    : executionPrice * (1.0 + (1.0 / leverage) * 0.9);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-crypto-dark">
      <Header />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Terminal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-crypto-border p-5 rounded-2xl backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span>Discretionary Manual Execution Desk</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Manual Order Execution</h1>
            <p className="text-xs text-crypto-muted mt-1">
              Execute human discretionary paper trades. Positions and balances are strictly isolated from algorithmic bot strategies.
            </p>
          </div>

          {/* Quick Pair Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-crypto-border p-1 rounded-xl">
            {QUICK_PAIRS.map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  setSelectedSymbol(sym);
                  setLimitPrice("");
                }}
                className={clsx(
                  "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  selectedSymbol === sym
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                {sym.split("/")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Live Chart & Order Entry Ticket */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 2 Cols: Chart */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-crypto-card border border-crypto-border px-4 py-2.5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-100 text-base">{selectedSymbol}</span>
                <span className="text-lg font-mono font-bold text-slate-100">
                  ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                {ticker && (
                  <span
                    className={clsx(
                      "text-xs font-semibold px-2 py-0.5 rounded font-mono",
                      ticker.percentage_24h >= 0
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    )}
                  >
                    {ticker.percentage_24h >= 0 ? "+" : ""}
                    {ticker.percentage_24h.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Timeframes */}
              <div className="flex items-center gap-1 text-xs">
                {["5m", "15m", "1h", "4h", "1d"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={clsx(
                      "px-2 py-1 rounded font-medium transition-colors cursor-pointer",
                      selectedTimeframe === tf
                        ? "bg-slate-800 text-indigo-400 font-bold"
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <TradingViewChart symbol={selectedSymbol} timeframe={selectedTimeframe} />
          </div>

          {/* 1 Col: Manual Order Ticket */}
          <div className="rounded-2xl border border-crypto-border bg-crypto-card p-5 space-y-5 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-crypto-border">
                <span className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-indigo-400" />
                  <span>Order Ticket</span>
                </span>
                <span className="text-xs text-crypto-muted flex items-center gap-1 font-mono">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>${cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT</span>
                </span>
              </div>

              {/* Long / Short Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-crypto-border">
                <button
                  type="button"
                  onClick={() => setPositionSide("LONG")}
                  className={clsx(
                    "py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    positionSide === "LONG"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <TrendingUp className="w-4 h-4" /> Open Long
                </button>
                <button
                  type="button"
                  onClick={() => setPositionSide("SHORT")}
                  className={clsx(
                    "py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    positionSide === "SHORT"
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <TrendingDown className="w-4 h-4" /> Open Short
                </button>
              </div>

              {/* Leverage Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold">⚡</span> Leverage Multiplier
                  </span>
                  <span className="font-bold text-indigo-400 text-xs font-mono">{leverage}x</span>
                </div>
                <div className="grid grid-cols-6 gap-1 bg-slate-900 p-1 rounded-xl border border-crypto-border">
                  {[1, 2, 5, 10, 20, 50].map((lev) => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setLeverage(lev)}
                      className={clsx(
                        "py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                        leverage === lev
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      )}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Type: Market vs Limit */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOrderType("market")}
                  className={clsx(
                    "flex-1 py-1.5 rounded-lg font-medium border transition-colors cursor-pointer",
                    orderType === "market"
                      ? "bg-slate-800 text-slate-100 border-indigo-500/40"
                      : "border-crypto-border text-slate-400 hover:bg-slate-800/40"
                  )}
                >
                  Market Execution
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("limit")}
                  className={clsx(
                    "flex-1 py-1.5 rounded-lg font-medium border transition-colors cursor-pointer",
                    orderType === "limit"
                      ? "bg-slate-800 text-slate-100 border-indigo-500/40"
                      : "border-crypto-border text-slate-400 hover:bg-slate-800/40"
                  )}
                >
                  Limit Order
                </button>
              </div>

              {/* Limit Price Input if limit selected */}
              {orderType === "limit" && (
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">Limit Price (USDT)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <input
                      type="number"
                      step="any"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder={currentPrice.toString()}
                      className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-crypto-border rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Order Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Contracts ({selectedSymbol.split("/")[0]})</span>
                  <span className="text-crypto-muted">Notional: ${notionalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  className="w-full px-3 py-2 bg-slate-900 border border-crypto-border rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                />

                {/* Quick Cash % buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickPercent(pct)}
                      className="py-1 text-[10px] font-semibold rounded bg-slate-900 border border-crypto-border text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Futures Execution Summary Box */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-crypto-border/60 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Contract & Side:</span>
                  <span className={clsx("font-bold font-mono", positionSide === "LONG" ? "text-emerald-400" : "text-rose-400")}>
                    {selectedSymbol} Perp ({positionSide} {leverage}x)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Required Margin:</span>
                  <span className="font-mono text-slate-100 font-bold">${marginRequired.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Liquidation Price:</span>
                  <span className="font-mono text-amber-400 font-semibold">${estLiqPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Est. Taker Fee (0.05%):</span>
                  <span className="font-mono">${estFee.toFixed(3)} USDT</span>
                </div>
              </div>

              {/* Feedback messages */}
              {orderResult && (
                <div
                  className={clsx(
                    "p-3 rounded-xl border text-xs flex items-start gap-2",
                    orderResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  )}
                >
                  {orderResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{orderResult.message}</span>
                </div>
              )}
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecuteTrade}
              disabled={submitting}
              className={clsx(
                "w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2",
                positionSide === "LONG"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                  : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30",
                submitting && "opacity-60 cursor-not-allowed"
              )}
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Crosshair className="w-4 h-4" />
                  <span>Execute {positionSide} {selectedSymbol} ({leverage}x)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dedicated Manual Open Positions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                <span>Manual Open Positions</span>
              </h2>
              <p className="text-xs text-crypto-muted">
                Track open paper positions created manually through this execution terminal.
              </p>
            </div>
          </div>

          <PositionsTable positions={positions} onPositionClosed={fetchTickerAndPortfolio} />
        </div>

        {/* Manual Trade History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span>Manual Trades History</span>
            </h2>
          </div>

          <RecentTradesTable trades={trades} />
        </div>
      </main>
    </div>
  );
}
