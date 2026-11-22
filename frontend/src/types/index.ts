export type StrategyType = "grid" | "trend" | "breakout";
export type StrategyStatus = "draft" | "active" | "paused" | "stopped";
export type SignalType = "BUY" | "SELL" | "HOLD";
export type SignalStatus = "PENDING" | "EXECUTED" | "CANCELLED" | "EXPIRED";
export type TradeSide = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "REJECTED";

export interface Strategy {
  id: string;
  user_id?: string;
  name: string;
  strategy_type: StrategyType;
  symbol: string;
  status: StrategyStatus;
  parameters: Record<string, any>;
  allocated_capital: number;
  current_capital: number;
  total_pnl: number;
  win_rate: number;
  created_at: string;
  updated_at: string;
}

export interface StrategyTemplate {
  strategy_type: StrategyType;
  name: string;
  description: string;
  default_parameters: Record<string, any>;
}

export interface Signal {
  id: string;
  strategy_id: string;
  symbol: string;
  signal_type: SignalType;
  price: number;
  confidence: number;
  reason?: string;
  metadata_json?: Record<string, any>;
  status: SignalStatus;
  created_at: string;
}

export interface Trade {
  id: string;
  strategy_id?: string;
  signal_id?: string;
  symbol: string;
  side: TradeSide;
  position_side?: "LONG" | "SHORT";
  leverage?: number;
  margin?: number;
  liquidation_price?: number;
  order_type: string;
  price: number;
  amount: number;
  cost: number;
  fee: number;
  fee_currency: string;
  realized_pnl: number;
  status: TradeStatus;
  exchange: string;
  is_paper: boolean;
  source?: "bot" | "manual";
  created_at: string;
  closed_at?: string;
}

export interface Ticker {
  symbol: string;
  last_price: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  change_24h: number;
  percentage_24h: number;
  timestamp: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  symbol: string;
  asset: string;
  side: "LONG" | "SHORT" | string;
  amount: number;
  entry_price: number;
  current_price: number;
  position_value: number;
  leverage?: number;
  margin?: number;
  liquidation_price?: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  source?: "bot" | "manual";
}

export type ScannerTimeframe = "5m" | "15m" | "1h" | "4h" | "1d";
export type TrendIndicator = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface MarketScanItem {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  percentage_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
  timeframe: ScannerTimeframe;
  timeframe_change_pct: number;
  timeframe_high: number;
  timeframe_low: number;
  trend_indicator: TrendIndicator;
  trend_score: number;
  market_timestamp: number;
  last_updated_at: string;
  feed_source: "LIVE_WEBSOCKET" | "REST_POLLING";
}

export interface MarketScanResponse {
  timeframe: ScannerTimeframe;
  last_successful_update: string;
  connection_status: string;
  monitored_count: number;
  items: MarketScanItem[];
}

export interface PortfolioSummary {
  total_strategies: number;
  total_allocated_capital: number;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  cash_balance: number;
  available_margin?: number;
  margin_used?: number;
  market_type?: string;
  positions_value: number;
  total_equity: number;
  positions_count: number;
  total_trades: number;
  total_volume: number;
  total_fees: number;
  paper_balances: Record<string, number>;
  system_status: string;
  trading_mode: string;
}
