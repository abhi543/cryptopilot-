"use client";

import React, { useState } from "react";
import { StrategyType } from "@/types";
import { api } from "@/services/api";
import { X, Layers, TrendingUp, Zap } from "lucide-react";

interface NewStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const NewStrategyModal: React.FC<NewStrategyModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [strategyType, setStrategyType] = useState<StrategyType>("grid");
  const [name, setName] = useState("BTC Grid Master");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [capital, setCapital] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strategy specific parameters
  const [gridLower, setGridLower] = useState(85000);
  const [gridUpper, setGridUpper] = useState(98000);
  const [gridLevels, setGridLevels] = useState(10);
  const [gridInvestment, setGridInvestment] = useState(100);

  const [trendFast, setTrendFast] = useState(9);
  const [trendSlow, setTrendSlow] = useState(21);

  const [breakoutLookback, setBreakoutLookback] = useState(20);
  const [breakoutVolumeFactor, setBreakoutVolumeFactor] = useState(1.2);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let parameters: Record<string, any> = {};
    if (strategyType === "grid") {
      parameters = {
        lower_price: Number(gridLower),
        upper_price: Number(gridUpper),
        grid_levels: Number(gridLevels),
        investment_per_grid: Number(gridInvestment),
      };
    } else if (strategyType === "trend") {
      parameters = {
        fast_period: Number(trendFast),
        slow_period: Number(trendSlow),
      };
    } else if (strategyType === "breakout") {
      parameters = {
        lookback_period: Number(breakoutLookback),
        volume_threshold_factor: Number(breakoutVolumeFactor),
      };
    }

    try {
      await api.createStrategy({
        name,
        strategy_type: strategyType,
        symbol,
        allocated_capital: Number(capital),
        parameters,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create strategy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-crypto-card border border-crypto-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-crypto-border flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Deploy New Strategy Engine</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Strategy Type Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Strategy Model</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStrategyType("grid");
                  setName("BTC Grid Master");
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  strategyType === "grid"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                    : "bg-slate-900 border-crypto-border text-slate-400 hover:border-slate-700"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStrategyType("trend");
                  setName("ETH Trend Hunter");
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  strategyType === "trend"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                    : "bg-slate-900 border-crypto-border text-slate-400 hover:border-slate-700"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Trend</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStrategyType("breakout");
                  setName("SOL Breakout Surge");
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  strategyType === "breakout"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                    : "bg-slate-900 border-crypto-border text-slate-400 hover:border-slate-700"
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Breakout</span>
              </button>
            </div>
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Strategy Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-crypto-border text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pair / Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-crypto-border text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="SOL/USDT">SOL/USDT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Allocated Capital (USDT)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              min={10}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-crypto-border text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Dynamic Strategy Parameters */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-crypto-border/50 space-y-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {strategyType.toUpperCase()} Engine Parameters
            </span>

            {strategyType === "grid" && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 text-[11px] block">Lower Price ($)</label>
                  <input
                    type="number"
                    value={gridLower}
                    onChange={(e) => setGridLower(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-crypto-border rounded text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-[11px] block">Upper Price ($)</label>
                  <input
                    type="number"
                    value={gridUpper}
                    onChange={(e) => setGridUpper(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-crypto-border rounded text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-[11px] block">Grid Levels</label>
                  <input
                    type="number"
                    value={gridLevels}
                    onChange={(e) => setGridLevels(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-crypto-border rounded text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-[11px] block">Per Grid Order ($)</label>
                  <input
                    type="number"
                    value={gridInvestment}
                    onChange={(e) => setGridInvestment(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-crypto-border rounded text-slate-200 text-xs"
                  />
                </div>
              </div>
            )}

            {strategyType === "trend" && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 text-[11px] block">Fast MA Period</label>
                  <input
                    type="number"
                    value={trendFast}
                    onChange={(e) => setTrendFast(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-crypto-border rounded text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-[11px] block">Slow MA Period</label>
                  <input
                    type="number"
                    value={trendSlow}
                    onChange={(e) => setTrendSlow(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-crypto-border rounded text-slate-200 text-xs"
                  />
                </div>
              </div>
            )}

            {strategyType === "breakout" && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 text-[11px] block">Lookback Period</label>
                  <input
                    type="number"
                    value={breakoutLookback}
                    onChange={(e) => setBreakoutLookback(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-crypto-border rounded text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-[11px] block">Volume Surge Factor</label>
                  <input
                    type="number"
                    step="0.1"
                    value={breakoutVolumeFactor}
                    onChange={(e) => setBreakoutVolumeFactor(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-crypto-border rounded text-slate-200 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/30"
            >
              {loading ? "Deploying..." : "Create Strategy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
