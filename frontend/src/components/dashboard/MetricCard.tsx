import React from "react";
import { Card } from "@/components/common/Card";
import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon?: LucideIcon;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  badge,
}) => {
  return (
    <Card className="flex flex-col justify-between hover:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-800/80 text-indigo-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold text-slate-100 tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1.5">
          {change !== undefined && (
            <span
              className={clsx(
                "text-xs font-semibold",
                change >= 0 ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {change >= 0 ? `+${change}%` : `${change}%`}
            </span>
          )}
          {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {badge}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
