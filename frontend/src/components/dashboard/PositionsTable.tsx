"use client";

import React, { useState } from "react";
import { Position } from "@/types";
import { Badge } from "@/components/common/Badge";
import { api } from "@/services/api";
import { clsx } from "clsx";
import { XCircle, TrendingUp, TrendingDown, Bot, Crosshair } from "lucide-react";

interface PositionsTableProps {
  positions: Position[];
  onClosePosition?: (symbol: string) => Promise<void>;
  onPositionClosed?: () => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  onClosePosition,
  onPositionClosed,
}) => {
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);

  const handleClose = async (symbol: string, source?: "bot" | "manual", side?: string) => {
    try {
      setClosingSymbol(symbol);
      if (onClosePosition) {
        await onClosePosition(symbol);
      } else {
        await api.closePosition(symbol, source || "manual", (side as any) || "LONG");
        if (onPositionClosed) onPositionClosed();
      }
    } finally {
      setClosingSymbol(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-crypto-border">
          <tr>
            <th className="px-4 py-3">Contract</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Side & Lev</th>
            <th className="px-4 py-3">Size</th>
            <th className="px-4 py-3">Entry Price</th>
            <th className="px-4 py-3">Mark Price</th>
            <th className="px-4 py-3">Margin</th>
            <th className="px-4 py-3">Liq. Price</th>
            <th className="px-4 py-3">Unrealized PnL (ROE)</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-crypto-border/50 font-mono">
          {positions.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-sans">
                No active open futures positions.
              </td>
            </tr>
          ) : (
            positions.map((pos) => {
              const isProfit = pos.unrealized_pnl >= 0;
              const isClosing = closingSymbol === pos.symbol;
              const isBot = pos.source === "bot";
              const isLong = pos.side?.toUpperCase() === "LONG";

              return (
                <tr key={`${pos.source || 'bot'}-${pos.symbol}-${pos.side}`} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{pos.asset}</span>
                      <span className="text-[10px] text-indigo-400 font-semibold">{pos.symbol} Perp</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase",
                        isBot
                          ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      )}
                    >
                      {isBot ? <Bot className="w-3 h-3" /> : <Crosshair className="w-3 h-3" />}
                      <span>{pos.source ? pos.source.toUpperCase() : "BOT"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase",
                        isLong
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      )}
                    >
                      {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {pos.side} {pos.leverage || 10}x
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    {pos.amount.toFixed(4)} {pos.asset}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    ${pos.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-slate-100 font-bold">
                    ${pos.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-indigo-300 font-semibold">
                    ${(pos.margin || ((pos.amount * pos.entry_price) / (pos.leverage || 10))).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-amber-400 font-medium">
                    {pos.liquidation_price ? `$${pos.liquidation_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {isProfit ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className={clsx("font-bold", isProfit ? "text-emerald-400" : "text-rose-400")}>
                        {isProfit ? `+$${pos.unrealized_pnl.toFixed(2)}` : `-$${Math.abs(pos.unrealized_pnl).toFixed(2)}`}
                      </span>
                      <span className={clsx("text-[10px] font-semibold", isProfit ? "text-emerald-400/90" : "text-rose-400/90")}>
                        ({isProfit ? `+${pos.unrealized_pnl_pct.toFixed(2)}%` : `${pos.unrealized_pnl_pct.toFixed(2)}%`} ROE)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-sans">
                    <button
                      onClick={() => handleClose(pos.symbol, pos.source, pos.side)}
                      disabled={isClosing}
                      className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isClosing ? "Closing..." : "Close"}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
