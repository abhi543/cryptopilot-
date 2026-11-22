"use client";

import React, { useState } from "react";
import { X, Plus, Search, Sparkles, Check } from "lucide-react";
import { api } from "@/services/api";

interface AddPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPairAdded: () => void;
  monitoredPairs?: string[];
  popularPairs?: { symbol: string; name: string }[];
}

export const AddPairModal: React.FC<AddPairModalProps> = ({
  isOpen,
  onClose,
  onPairAdded,
  monitoredPairs = [],
  popularPairs = [],
}) => {
  const [customSymbol, setCustomSymbol] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      await api.addTradingPair(symbol);
      setSuccessMsg(`Added ${symbol.toUpperCase()} successfully!`);
      setCustomSymbol("");
      onPairAdded();
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setError(err.message || "Failed to add pair");
    } finally {
      setLoading(false);
    }
  };

  const filteredPopular = popularPairs.filter(
    (p) =>
      p.symbol.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-crypto-card border border-crypto-border rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-crypto-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100">Add New Trading Pair</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
              <Check className="w-4 h-4" /> {successMsg}
            </div>
          )}

          {/* Custom Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Custom Binance Pair
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. ADA/USDT or AVAX"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-crypto-border text-xs text-slate-200 focus:outline-none focus:border-indigo-500 uppercase font-mono"
              />
              <button
                onClick={() => customSymbol && handleAdd(customSymbol)}
                disabled={loading || !customSymbol.trim()}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Quick Select Trending */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Popular Coins on Binance</span>
              <div className="relative w-36">
                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 rounded bg-slate-900 border border-crypto-border text-[11px] text-slate-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filteredPopular.map((p) => {
                const isMonitored = monitoredPairs.includes(p.symbol);
                return (
                  <div
                    key={p.symbol}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-crypto-border/60 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <span className="font-mono font-semibold text-xs text-slate-200 block">
                        {p.symbol}
                      </span>
                      <span className="text-[11px] text-slate-500">{p.name}</span>
                    </div>

                    {isMonitored ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                        Monitoring
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdd(p.symbol)}
                        disabled={loading}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Track
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-crypto-border bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
