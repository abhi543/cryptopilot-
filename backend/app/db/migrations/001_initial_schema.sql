-- ==============================================================================
-- CryptoPilot Initial Schema Migration (Supabase PostgreSQL / Standard SQL)
-- Migration: 001_initial_schema.sql
-- ==============================================================================

-- 1. Enable UUID Extension (Supabase / Postgres)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_superuser BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Strategies Table
-- Strategy Types: 'grid', 'trend', 'breakout'
-- Statuses: 'active', 'paused', 'stopped', 'draft'
CREATE TABLE IF NOT EXISTS strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft' NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    allocated_capital NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    current_capital NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    total_pnl NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    win_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Signals Table
-- Signal Types: 'BUY', 'SELL', 'HOLD'
-- Statuses: 'PENDING', 'EXECUTED', 'EXPIRED', 'CANCELLED'
CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    signal_type VARCHAR(20) NOT NULL,
    price NUMERIC(18, 8) NOT NULL,
    confidence NUMERIC(5, 4) DEFAULT 1.0000 NOT NULL,
    reason VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Trades Table
-- Sides: 'BUY', 'SELL'
-- Order Types: 'MARKET', 'LIMIT', 'STOP_LIMIT'
-- Status: 'OPEN', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED'
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
    symbol VARCHAR(30) NOT NULL,
    side VARCHAR(10) NOT NULL,
    order_type VARCHAR(20) NOT NULL DEFAULT 'MARKET',
    price NUMERIC(18, 8) NOT NULL,
    amount NUMERIC(18, 8) NOT NULL,
    cost NUMERIC(18, 8) NOT NULL,
    fee NUMERIC(18, 8) DEFAULT 0.00000000,
    fee_currency VARCHAR(10) DEFAULT 'USDT',
    realized_pnl NUMERIC(18, 8) DEFAULT 0.00000000,
    status VARCHAR(30) DEFAULT 'FILLED' NOT NULL,
    exchange VARCHAR(50) DEFAULT 'binance' NOT NULL,
    external_order_id VARCHAR(100),
    is_paper BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Performance Records Table
CREATE TABLE IF NOT EXISTS performance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_equity NUMERIC(18, 8) NOT NULL,
    daily_pnl NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    cumulative_pnl NUMERIC(18, 8) DEFAULT 0.00000000 NOT NULL,
    win_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    total_trades INT DEFAULT 0 NOT NULL,
    winning_trades INT DEFAULT 0 NOT NULL,
    losing_trades INT DEFAULT 0 NOT NULL,
    profit_factor NUMERIC(8, 4) DEFAULT 0.0000 NOT NULL,
    max_drawdown NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 7. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_strategies_user ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_type ON strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status);
CREATE INDEX IF NOT EXISTS idx_signals_strategy ON signals(strategy_id);
CREATE INDEX IF NOT EXISTS idx_signals_created ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_strategy_timestamp ON performance_records(strategy_id, timestamp DESC);
