# CryptoPilot 🚀
### Professional Cryptocurrency Multi-Strategy Algorithmic Trading Platform

CryptoPilot is a modular, high-performance cryptocurrency algorithmic trading desk built for deploying, monitoring, and executing multi-strategy quantitative models.

---

## 🏛️ System Architecture

CryptoPilot is strictly architected according to clean architectural boundaries:
- **Presentation Layer (Frontend)**: Next.js (App Router), React, Tailwind CSS, TradingView Lightweight Charts, WebSockets.
- **Application & API Layer (Backend)**: Python, FastAPI, Pydantic V2, WebSockets, Structured Logging.
- **Strategy & Analytics Engine**: Isolated algorithmic strategy classes (`Grid`, `Trend`, `Breakout`), pure signal generation decoupled from execution.
- **Exchange & Execution Service**: CCXT wrapper with paper trading safety bounds. Live execution is strictly locked down in Phase 1.
- **Persistence Layer (Database)**: Supabase (PostgreSQL) production schema with async SQLAlchemy engine & seamless local SQLite fallback.

```
                           ┌───────────────────────────┐
                           │    CryptoPilot Client     │
                           │  Next.js + Tailwind CSS   │
                           │  TradingView Charts (UI)  │
                           └─────────────┬─────────────┘
                                         │
                         REST API (v1)   │   WebSockets (/ws/feed)
                                         ▼
                           ┌───────────────────────────┐
                           │     FastAPI Application   │
                           │  - Auth & Strategy APIs   │
                           │  - Market Data Broadcast  │
                           │  - Paper Order Simulator  │
                           └───────┬───────────┬───────┘
                                   │           │
                 ┌─────────────────┘           └─────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │     Strategy Engine       │                   │    Persistence Engine     │
   │ - Grid Trading Strategy   │                   │ - Supabase / PostgreSQL   │
   │ - Trend Following (MA)    │                   │ - SQLAlchemy Async ORM    │
   │ - Breakout (Donchian)     │                   │ - DDL Schema Migrations   │
   └─────────────┬─────────────┘                   └───────────────────────────┘
                 │
                 ▼
   ┌───────────────────────────┐
   │     Exchange Layer        │
   │ - CCXT Service            │
   │ - Public Tickers / OHLCV  │
   │ - Safe Paper Executions   │
   └───────────────────────────┘
```

---

## 📂 Project Structure & Module Purpose

```
Crypto trading/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py         # Developer & user authentication endpoints
│   │   │   │   │   ├── strategies.py   # Strategy CRUD, lifecycle (activate/pause/stop) & templates
│   │   │   │   │   ├── trades.py       # Trade history querying and simulated paper order execution
│   │   │   │   │   ├── signals.py      # Real-time strategy signal querying & creation
│   │   │   │   │   ├── performance.py  # Portfolio metrics, paper equity & drawdown analytics
│   │   │   │   │   └── market.py       # Exchange ticker prices and OHLCV candlestick data
│   │   │   │   └── router.py           # Centralized API v1 route aggregator
│   │   │   ├── websockets/
│   │   │   │   └── live_feed.py        # Real-time WebSocket connection for ticks and signals
│   │   │   └── deps.py                 # Dependency injection helpers (DB sessions)
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic Settings for secure environment configuration
│   │   │   ├── logging.py              # Structured, colorized logging system
│   │   │   └── security.py             # Security utilities and token helpers
│   │   ├── db/
│   │   │   ├── base.py                 # SQLAlchemy declarative base
│   │   │   ├── session.py              # Async DB engine & session lifecycle manager
│   │   │   └── migrations/
│   │   │       └── 001_initial_schema.sql # Standard PostgreSQL DDL migration script for Supabase
│   │   ├── models/                     # SQLAlchemy ORM database models
│   │   │   ├── user.py                 # User identity and credentials
│   │   │   ├── strategy.py             # Strategy configurations and state
│   │   │   ├── trade.py                # Executed order records (prices, fees, pnl)
│   │   │   ├── signal.py               # Quantitative signals produced by strategies
│   │   │   └── performance.py          # Daily equity snapshots and performance telemetry
│   │   ├── schemas/                    # Pydantic validation and serialization schemas
│   │   │   ├── user.py, strategy.py, trade.py, signal.py, performance.py, market.py
│   │   ├── services/
│   │   │   ├── exchange_service.py     # CCXT exchange integration with simulated paper execution
│   │   │   └── market_data.py          # Real-time ticker broadcaster and tick processor
│   │   ├── strategies/                 # Quantitative Trading Strategies (Isolated from UI/DB)
│   │   │   ├── base.py                 # Abstract BaseStrategy interface
│   │   │   ├── grid.py                 # Grid Trading Strategy (mean-reversion range bot)
│   │   │   ├── trend.py                # Trend Following Strategy (dual MA crossover + momentum)
│   │   │   ├── breakout.py             # Breakout Strategy (Donchian channel + volume surge)
│   │   │   └── registry.py             # Strategy manager, factory and in-memory lifecycle registry
│   │   └── main.py                     # FastAPI application entrypoint and lifespan coordinator
│   ├── tests/                          # Automated Pytest test suite
│   ├── run.py                          # Local server launcher
│   ├── requirements.txt                # Python backend dependencies
│   └── .env.example                    # Template for backend environment variables
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root responsive layout and theme provider
│   │   │   ├── page.tsx                # Main live Trading Dashboard
│   │   │   ├── globals.css             # Tailwind and dark terminal aesthetic variables
│   │   │   └── strategies/
│   │   │       └── page.tsx            # Strategy fleet management page
│   │   ├── components/
│   │   │   ├── common/                 # Reusable atomic UI components (Card, Badge, StatusDot)
│   │   │   ├── layout/                 # Layout components (Navbar, Header, Sidebar)
│   │   │   └── dashboard/
│   │   │       ├── TradingViewChart.tsx# Responsive TradingView Lightweight Chart
│   │   │       ├── MetricCard.tsx      # Dashboard performance metric display
│   │   │       ├── StrategyCard.tsx    # Strategy instance status and controls
│   │   │       ├── RecentTradesTable.tsx # Live trade log table
│   │   │       ├── SignalFeed.tsx      # Real-time quantitative signal feed
│   │   │       └── NewStrategyModal.tsx# Strategy deployment modal
│   │   ├── services/
│   │   │   ├── api.ts                  # REST API client
│   │   │   └── websocket.ts            # Resilient WebSocket client with auto-reconnect
│   │   └── types/
│   │       └── index.ts                # TypeScript interfaces for full-stack contracts
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
└── README.md
```

---

## 🎯 Supported Trading Strategies

### 1. Grid Trading Strategy (`grid`)
- **Concept**: Divides a specified price band into geometric or arithmetic grid levels.
- **Operation**: Emits `BUY` signals when price dips into lower levels and `SELL` signals when price rebounds into higher levels.
- **Parameters**: `lower_price`, `upper_price`, `grid_levels`, `investment_per_grid`.

### 2. Trend Following Strategy (`trend`)
- **Concept**: Detects prevailing directional momentum using dual Moving Average crossovers (Fast MA vs Slow MA).
- **Operation**: Emits `BUY` on Golden Crosses (Fast MA crosses above Slow MA) and `SELL` on Death Crosses.
- **Parameters**: `fast_period` (e.g. 9), `slow_period` (e.g. 21).

### 3. Breakout Trading Strategy (`breakout`)
- **Concept**: Capitalizes on volatility expansion when prices break out of multi-period Donchian channels.
- **Operation**: Emits `BUY` when price breaches recent resistance with volume surge confirmation, and `SELL` when price falls below support.
- **Parameters**: `lookback_period` (e.g. 20), `volume_threshold_factor` (e.g. 1.2).

---

## 🗄️ Database Setup (Supabase / PostgreSQL)

The schema is located at:
`backend/app/db/migrations/001_initial_schema.sql`

To use Supabase:
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run `backend/app/db/migrations/001_initial_schema.sql`.
3. In `backend/.env`, set:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres
   ```
*(Note: If no Supabase URL is provided, the backend seamlessly falls back to `sqlite+aiosqlite:///./cryptopilot.db` for zero-configuration local development and testing).*

---

## 🚀 Quickstart & Setup Instructions

### 1. Backend Setup
```bash
# 1. Activate Python virtual environment
.\venv\Scripts\activate   # Windows
# or: source venv/bin/activate  # macOS / Linux

# 2. Configure environment
cd backend
cp .env.example .env

# 3. Run automated test suite
pytest -v

# 4. Start backend API & WebSocket server
python run.py
```
Backend will start on: **`http://localhost:8000`**
- Interactive Swagger API Documentation: **`http://localhost:8000/api/v1/docs`**
- System Health: **`http://localhost:8000/health`**
- Live WebSocket Feed: **`ws://localhost:8000/ws/feed`**

### 2. Frontend Setup
```bash
# 1. Navigate to frontend
cd frontend

# 2. Configure environment
cp .env.example .env.local

# 3. Start development server
npm run dev
# or for production: npm run build && npm run start
```
Frontend will be accessible at: **`http://localhost:3000`**

---

## 🛡️ Security & Trading Safety Rules (Phase 1)
- **Live Trading Disabled**: `TRADING_MODE=paper` and `ALLOW_LIVE_TRADING=false` are strictly enforced by the backend exchange service.
- **No Hardcoded Credentials**: All exchange API keys and database credentials are read dynamically from `.env`.
- **Trading Logic Isolation**: All calculations occur exclusively in the Python backend strategy engines; frontend components are pure presentation layers.

---

## 📋 Phase 1 Status & Roadmap

### Completed in Phase 1:
- [x] Clean modular directory structure separating frontend, backend, strategies, and database layers.
- [x] Database schema for users, strategies, trades, signals, and performance records (`001_initial_schema.sql` + SQLAlchemy models).
- [x] Three independent strategy engines implemented: Grid Trading, Trend Following, and Breakout Trading.
- [x] Strategy registry and in-memory runtime management.
- [x] CCXT integration with paper trading execution simulation.
- [x] Real-time market data feed and WebSocket broadcaster.
- [x] Full REST API endpoints (strategies, trades, signals, market data, portfolio performance).
- [x] Responsive dark-themed Next.js application with Tailwind CSS.
- [x] Interactive TradingView Lightweight Charts integration.
- [x] Reusable component library (Cards, Badges, StatusDots, Tables, Modals).
- [x] 8/8 automated unit tests passing across API and strategies.
- [x] Production Next.js build compilation tested and verified with zero errors.

### Pending for Subsequent Phases:
- [ ] Phase 2: Historical backtesting engine and walk-forward parameter optimizer.
- [ ] Phase 3: Live exchange WebSocket feed orderbook depth and latency minimization.
- [ ] Phase 4: Risk management module (Max Drawdown auto-kill switch, VaR, position sizing constraints).
- [ ] Phase 5: Live order execution with hardware-signed API keys and multi-exchange routing.
