import React from "react";
import { Strategy } from "@/types";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { StatusDot } from "@/components/common/StatusDot";
import { Play, Pause, Square, TrendingUp, Layers, Zap } from "lucide-react";
import { clsx } from "clsx";

interface StrategyCardProps {
  strategy: Strategy;
  onStatusChange?: (id: string, action: "activate" | "pause" | "stop") => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, onStatusChange }) => {
  const typeIcons = {
    grid: Layers,
    trend: TrendingUp,
    breakout: Zap,
  };

  const Icon = typeIcons[strategy.strategy_type] || Layers;

  const statusVariantMap: Record<string, "success" | "warning" | "danger" | "default"> = {
    active: "success",
    paused: "warning",
    stopped: "danger",
    draft: "default",
  };

  return (
    <Card className="hover:border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100">{strategy.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-medium text-slate-300">{strategy.symbol}</span>
              <span className="text-crypto-muted text-xs">•</span>
              <span className="text-[11px] capitalize text-crypto-muted">{strategy.strategy_type}</span>
            </div>
          </div>
        </div>

        <Badge variant={statusVariantMap[strategy.status] || "default"} size="sm">
          <StatusDot status={strategy.status as any} pulse={strategy.status === "active"} />
          <span>{strategy.status}</span>
        </Badge>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-900/60 border border-crypto-border/50 mb-4 text-xs">
        <div>
          <span className="text-[10px] text-crypto-muted uppercase tracking-wider block">Capital</span>
          <span className="font-semibold text-slate-200">${strategy.allocated_capital.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] text-crypto-muted uppercase tracking-wider block">Realized PnL</span>
          <span
            className={clsx(
              "font-semibold",
              strategy.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {strategy.total_pnl >= 0 ? `+$${strategy.total_pnl.toFixed(2)}` : `-$${Math.abs(strategy.total_pnl).toFixed(2)}`}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-crypto-muted uppercase tracking-wider block">Win Rate</span>
          <span className="font-semibold text-slate-200">{strategy.win_rate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-crypto-border/40">
        {strategy.status !== "active" ? (
          <button
            onClick={() => onStatusChange?.(strategy.id, "activate")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3" /> Run
          </button>
        ) : (
          <button
            onClick={() => onStatusChange?.(strategy.id, "pause")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-xs font-medium transition-colors"
          >
            <Pause className="w-3 h-3" /> Pause
          </button>
        )}

        {strategy.status !== "stopped" && (
          <button
            onClick={() => onStatusChange?.(strategy.id, "stop")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors"
          >
            <Square className="w-3 h-3" /> Stop
          </button>
        )}
      </div>
    </Card>
  );
};
