-- ==============================================================================
-- CryptoPilot Phase 2: Market Scanner Schema Migration
-- Migration: 002_market_scanner.sql
-- ==============================================================================

-- 1. Monitored Pairs Table
CREATE TABLE IF NOT EXISTS monitored_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(30) UNIQUE NOT NULL,
    base_asset VARCHAR(15) NOT NULL,
    quote_asset VARCHAR(15) NOT NULL,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seed default monitored pairs
INSERT INTO monitored_pairs (symbol, base_asset, quote_asset, display_name)
VALUES
    ('BTC/USDT', 'BTC', 'USDT', 'Bitcoin'),
    ('ETH/USDT', 'ETH', 'USDT', 'Ethereum'),
    ('SOL/USDT', 'SOL', 'USDT', 'Solana'),
    ('BNB/USDT', 'BNB', 'USDT', 'BNB'),
    ('XRP/USDT', 'XRP', 'USDT', 'Ripple'),
    ('DOGE/USDT', 'DOGE', 'USDT', 'Dogecoin')
ON CONFLICT (symbol) DO NOTHING;

-- 2. Market Candles Historical Table (Strict duplicate prevention)
CREATE TABLE IF NOT EXISTS market_candles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(30) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    timestamp BIGINT NOT NULL,
    open NUMERIC(18, 8) NOT NULL,
    high NUMERIC(18, 8) NOT NULL,
    low NUMERIC(18, 8) NOT NULL,
    close NUMERIC(18, 8) NOT NULL,
    volume NUMERIC(24, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_candle_symbol_timeframe_timestamp UNIQUE (symbol, timeframe, timestamp)
);

-- 3. Indexes for Market Scanner
CREATE INDEX IF NOT EXISTS idx_market_candles_lookup 
ON market_candles(symbol, timeframe, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_monitored_pairs_active 
ON monitored_pairs(is_active);
