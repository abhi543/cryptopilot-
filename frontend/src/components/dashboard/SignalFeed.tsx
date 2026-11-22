"use client";

import React, { useEffect, useState } from "react";
import { Signal } from "@/types";
import { Badge } from "@/components/common/Badge";
import { liveFeed } from "@/services/websocket";
import { Zap, Radio } from "lucide-react";

interface SignalFeedProps {
  initialSignals: Signal[];
}

export const SignalFeed: React.FC<SignalFeedProps> = ({ initialSignals }) => {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);

  useEffect(() => {
    setSignals(initialSignals);
  }, [initialSignals]);

  useEffect(() => {
    const unsub = liveFeed.on("NEW_SIGNAL", (newSig: any) => {
      setSignals((prev) => [newSig, ...prev.slice(0, 19)]);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
      {signals.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          <Radio className="w-6 h-6 mx-auto mb-2 text-slate-600 animate-pulse" />
          Listening for strategy signals...
        </div>
      ) : (
        signals.map((s, idx) => (
          <div
            key={s.id || idx}
            className="p-3 rounded-lg bg-crypto-card border border-crypto-border flex items-start justify-between hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-400 mt-0.5">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-xs text-slate-200">{s.symbol}</span>
                  <Badge variant={s.signal_type === "BUY" ? "success" : "danger"} size="sm">
                    {s.signal_type}
                  </Badge>
                  <span className="text-[11px] text-crypto-muted">
                    {new Date(s.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {s.reason || "Algorithm threshold triggered"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-slate-200 block">
                ${s.price.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500">
                {(s.confidence * 100).toFixed(0)}% conf
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
