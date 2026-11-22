"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { StatusDot } from "@/components/common/StatusDot";
import { liveFeed } from "@/services/websocket";
import { api } from "@/services/api";
import { Wallet, Server, Zap, Play, Pause } from "lucide-react";

interface HeaderProps {
  onOpenNewStrategy?: () => void;
  paperBalance?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewStrategy, paperBalance = 50000.0 }) => {
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isAutoTrading, setIsAutoTrading] = useState(true);
  const [loadingToggle, setLoadingToggle] = useState(false);

  useEffect(() => {
    liveFeed.connect();
    const unsub = liveFeed.on("status", (data) => {
      setIsWsConnected(data.connected);
    });

    api.getAutoTradingStatus()
      .then((res) => setIsAutoTrading(res.enabled))
      .catch(() => {});

    return () => unsub();
  }, []);

  const handleToggleAutoTrading = async () => {
    try {
      setLoadingToggle(true);
      const res = await api.toggleAutoTrading();
      setIsAutoTrading(res.enabled);
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    } finally {
      setLoadingToggle(false);
    }
  };

  return (
    <header className="h-16 border-b border-crypto-border bg-crypto-dark/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Info Badges */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-crypto-card border border-crypto-border text-xs">
          <StatusDot status="online" pulse={true} />
          <span className="text-slate-400">Feed:</span>
          <span className="font-semibold text-slate-200">
            {isWsConnected ? "Live Stream (WebSocket)" : "Live Feed (Auto-Sync)"}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-crypto-card border border-crypto-border text-xs">
          <Server className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Market:</span>
          <span className="font-semibold text-emerald-400">Bybit Futures (USDT-M)</span>
        </div>

        {/* 24/7 Continuous Master Auto-Trader Switch */}
        <button
          onClick={handleToggleAutoTrading}
          disabled={loadingToggle}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm cursor-pointer ${
            isAutoTrading
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 shadow-emerald-500/20"
              : "bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 shadow-rose-500/20"
          }`}
          title="Master Switch: Click to start or stop continuous 24/7 bot execution"
        >
          {isAutoTrading ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Pause className="w-3.5 h-3.5 text-emerald-400" />
              <span>BOT: RUNNING (Click to STOP)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-rose-400" />
              <span>BOT: STOPPED (Click to START)</span>
            </>
          )}
        </button>
      </div>

      {/* Right Actions & Balance */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-crypto-card border border-crypto-border">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <div className="text-right">
            <span className="text-[10px] text-crypto-muted uppercase tracking-wider block leading-none">Total Equity</span>
            <span className="text-xs font-bold text-slate-100">
              ${paperBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
          </div>
        </div>

        {onOpenNewStrategy && (
          <button
            onClick={onOpenNewStrategy}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm shadow-indigo-600/30 cursor-pointer"
          >
            + Deploy Strategy
          </button>
        )}
      </div>
    </header>
  );
};
