"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Crosshair, Radar, Layers, ShieldAlert, Cpu } from "lucide-react";
import { clsx } from "clsx";

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: "Bot Trading", href: "/", icon: Bot, badge: "Auto" },
    { label: "Manual Trading", href: "/manual-trading", icon: Crosshair, badge: "Desk" },
    { label: "Market Scanner", href: "/scanner", icon: Radar, badge: "Phase 2" },
    { label: "Strategies", href: "/strategies", icon: Layers },
  ];

  return (
    <aside className="w-64 border-r border-crypto-border bg-crypto-dark/95 flex flex-col justify-between p-4 min-h-screen">
      <div>
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
            CP
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 tracking-tight">CryptoPilot</h1>
            <p className="text-[11px] text-crypto-muted uppercase tracking-wider font-semibold">Algorithmic Desk</p>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={clsx(
                    "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider",
                    active ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-500"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Strategies Quick Tag */}
        <div className="mt-8 px-3">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Supported Engines</div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-crypto-border/50">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Grid Trading
              </span>
              <span className="text-[10px] text-slate-500">Range</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-crypto-border/50">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Trend Following
              </span>
              <span className="text-[10px] text-slate-500">Momentum</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-crypto-border/50">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Breakout Trading
              </span>
              <span className="text-[10px] text-slate-500">Volatility</span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Notice Bottom Card */}
      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
        <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Paper Mode (Phase 1)</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Simulated trading active. Live exchange execution safely locked.
        </p>
      </div>
    </aside>
  );
};
