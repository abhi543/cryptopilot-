import React from "react";
import { Trade } from "@/types";
import { Badge } from "@/components/common/Badge";
import { clsx } from "clsx";

interface RecentTradesTableProps {
  trades: Trade[];
}

export const RecentTradesTable: React.FC<RecentTradesTableProps> = ({ trades }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-crypto-border">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Contract</th>
            <th className="px-4 py-3">Side & Lev</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Contracts</th>
            <th className="px-4 py-3">Margin (USDT)</th>
            <th className="px-4 py-3">Realized PnL</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-crypto-border/50 font-mono">
          {trades.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-sans">
                No recent futures trades recorded yet.
              </td>
            </tr>
          ) : (
            trades.map((t) => {
              const posSide = t.position_side || (t.side === "BUY" ? "LONG" : "SHORT");
              const isLong = posSide === "LONG";
              const hasPnl = Math.abs(t.realized_pnl || 0) > 0.0001;
              const isProfit = (t.realized_pnl || 0) >= 0;

              return (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400">
                    {new Date(t.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-200">
                    {t.symbol} <span className="text-[10px] text-indigo-400">Perp</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={clsx(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase",
                        isLong
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      )}
                    >
                      {posSide} {t.leverage || 10}x
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-200">${t.price.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-slate-300">{t.amount.toFixed(4)}</td>
                  <td className="px-4 py-2.5 text-indigo-300 font-medium">
                    ${(t.margin || ((t.amount * t.price) / (t.leverage || 10))).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    {hasPnl ? (
                      <span className={clsx("font-bold text-xs", isProfit ? "text-emerald-400" : "text-rose-400")}>
                        {isProfit ? `+$${t.realized_pnl.toFixed(2)}` : `-$${Math.abs(t.realized_pnl).toFixed(2)}`}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-sans">
                    <span className="text-emerald-400 font-medium">{t.status}</span>
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
