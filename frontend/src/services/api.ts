import {
  Strategy,
  StrategyTemplate,
  Trade,
  Signal,
  Ticker,
  OHLCV,
  PortfolioSummary,
  Position,
  MarketScanResponse,
  ScannerTimeframe
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.origin && !window.location.origin.includes(":3000")
    ? "/api/v1"
    : "http://127.0.0.1:8000/api/v1");

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers, cache: "no-store" });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`[CryptoPilot API] ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Strategies
  getStrategyTemplates: () => request<StrategyTemplate[]>("/strategies/templates"),
  listStrategies: () => request<Strategy[]>("/strategies/"),
  getStrategy: (id: string) => request<Strategy>(`/strategies/${id}`),
  createStrategy: (data: Partial<Strategy>) =>
    request<Strategy>("/strategies/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateStrategyStatus: (id: string, action: "activate" | "pause" | "stop") =>
    request<Strategy>(`/strategies/${id}/status?action=${action}`, {
      method: "PATCH",
    }),

  // Trades & Positions
  listTrades: (limit = 20) => request<Trade[]>(`/trades/?limit=${limit}`),
  getPositions: (source?: "bot" | "manual") =>
    request<Position[]>(source ? `/trades/positions?source=${source}` : "/trades/positions"),
  closePosition: (symbol: string, source: "bot" | "manual" = "manual", position_side?: "LONG" | "SHORT") =>
    request<{ message: string; trade: Trade }>("/trades/positions/close", {
      method: "POST",
      body: JSON.stringify({ symbol, source, position_side }),
    }),
  executeManualTrade: (data: {
    symbol: string;
    side: "BUY" | "SELL" | "LONG" | "SHORT";
    position_side?: "LONG" | "SHORT";
    leverage?: number;
    amount: number;
    order_type?: string;
    price?: number;
  }) =>
    request<Trade>("/trades/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAutoTradingStatus: () =>
    request<{ enabled: boolean; cooldown_sec: number; total_auto_trades: number }>("/trades/auto-trading"),
  toggleAutoTrading: (enable?: boolean) =>
    request<{ enabled: boolean; message: string }>(
      enable !== undefined ? `/trades/auto-trading/toggle?enable=${enable}` : "/trades/auto-trading/toggle",
      { method: "POST" }
    ),
  executePaperTrade: (data: Partial<Trade>) =>
    request<Trade>("/trades/paper", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Market Scanner (Phase 2)
  getMarketScan: (timeframe: ScannerTimeframe = "1h") =>
    request<MarketScanResponse>(`/scanner/markets?timeframe=${timeframe}`),
  getScannerPairs: () =>
    request<{ monitored: string[]; popular: { symbol: string; name: string }[] }>("/scanner/pairs"),
  addScannerPair: (symbol: string) =>
    request<{ message: string; monitored: string[] }>("/scanner/pairs", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),
  removeScannerPair: (symbol: string) =>
    request<{ message: string; monitored: string[] }>(`/scanner/pairs/${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    }),

  // Signals
  listSignals: (limit = 20) => request<Signal[]>(`/signals/?limit=${limit}`),

  // Performance
  getPortfolioSummary: () => request<PortfolioSummary>("/performance/summary"),

  // Market & Dynamic Pairs
  getTradingPairs: () =>
    request<{ monitored: string[]; popular: { symbol: string; name: string }[] }>("/market/pairs"),
  addTradingPair: (symbol: string) =>
    request<{ message: string; monitored: string[] }>("/market/pairs", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),
  removeTradingPair: (symbol: string) =>
    request<{ message: string; monitored: string[] }>(`/market/pairs/${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    }),
  getTickers: (symbols?: string) =>
    request<Ticker[]>(symbols ? `/market/tickers?symbols=${symbols}` : "/market/tickers"),
  getOHLCV: (symbol = "BTC/USDT", timeframe = "1h", limit = 60) =>
    request<OHLCV[]>(`/market/ohlcv?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`),
};
