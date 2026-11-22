import React from "react";
import { clsx } from "clsx";

interface StatusDotProps {
  status: "active" | "online" | "paused" | "offline" | "draft" | "stopped";
  pulse?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, pulse = false }) => {
  const colorMap = {
    active: "bg-emerald-500",
    online: "bg-emerald-500",
    paused: "bg-amber-500",
    draft: "bg-slate-400",
    offline: "bg-rose-500",
    stopped: "bg-rose-500",
  };

  const bg = colorMap[status] || "bg-slate-400";

  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && (
        <span
          className={clsx(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            bg
          )}
        />
      )}
      <span className={clsx("relative inline-flex rounded-full h-2.5 w-2.5", bg)} />
    </span>
  );
};
