"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StrategyCard } from "@/components/dashboard/StrategyCard";
import { NewStrategyModal } from "@/components/dashboard/NewStrategyModal";
import { Card } from "@/components/common/Card";
import { Strategy, StrategyTemplate } from "@/types";
import { api } from "@/services/api";
import { Layers, Plus, BookOpen } from "lucide-react";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [strats, tmpls] = await Promise.allSettled([
        api.listStrategies(),
        api.getStrategyTemplates(),
      ]);
      if (strats.status === "fulfilled") setStrategies(strats.value);
      if (tmpls.status === "fulfilled") setTemplates(tmpls.value);
    } catch (err) {
      console.error("Failed to load strategies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, action: "activate" | "pause" | "stop") => {
    try {
      await api.updateStrategyStatus(id, action);
      await loadData();
    } catch (err: any) {
      alert(`Action error: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-crypto-dark min-h-screen">
      <Header onOpenNewStrategy={() => setIsModalOpen(true)} />

      <main className="flex-1 p-6 space-y-8 max-w-7xl w-full mx-auto">
        {/* Strategy Engine Archetypes */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">Strategy Archetypes</h2>
            <p className="text-xs text-crypto-muted">
              Pre-configured algorithmic trading models available on CryptoPilot
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <Card key={tpl.strategy_type} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-2 rounded bg-indigo-500/10 text-indigo-400">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <h3 className="font-semibold text-sm text-slate-100">{tpl.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">{tpl.description}</p>
                </div>

                <div className="pt-3 border-t border-crypto-border flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-indigo-400 font-semibold">
                    {tpl.strategy_type}
                  </span>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Deploy Engine <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Configured Strategies */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100">Configured Instances</h2>
              <p className="text-xs text-crypto-muted">
                Manage lifecycle, capital allocation, and runtime state of deployed instances
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm shadow-indigo-600/30"
            >
              + Create New Instance
            </button>
          </div>

          {strategies.length === 0 ? (
            <Card className="p-8 text-center">
              <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No Instances Active</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Click Deploy Engine above to spin up a Grid, Trend, or Breakout strategy.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategies.map((strat) => (
                <StrategyCard
                  key={strat.id}
                  strategy={strat}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <NewStrategyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
}
