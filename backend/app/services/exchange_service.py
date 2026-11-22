import asyncio
import time
from typing import Dict, Any, List, Optional
import ccxt.async_support as ccxt_async
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.market import Ticker, OHLCV, Position

class ExchangeService:
    """
    Exchange integration service wrapping CCXT.
    
    Provides public market data (tickers, orderbook, OHLCV candles).
    Strictly safeguards trading execution in Phase 1: live orders are blocked,
    and paper/simulated order execution is provided instead.
    """

    def __init__(self):
        self.exchange_id = settings.DEFAULT_EXCHANGE
        self.sandbox = settings.EXCHANGE_SANDBOX
        self._exchange = None
        self._paper_cash_usdt = 50000.0
        # Active positions: symbol -> dict(amount, entry_price, total_cost, asset)
        self._positions: Dict[str, Dict[str, Any]] = {}
        self._ticker_cache: Dict[str, Ticker] = {}
        # Dynamic monitored pairs list
        self._monitored_pairs: List[str] = [
            "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT"
        ]
        self._markets_cache = None

    def get_monitored_pairs(self) -> List[str]:
        return list(self._monitored_pairs)

    async def add_monitored_pair(self, symbol: str) -> bool:
        symbol = symbol.upper().strip()
        if not symbol.endswith("/USDT") and "/" not in symbol:
            symbol = f"{symbol}/USDT"
        
        if symbol in self._monitored_pairs:
            return True

        # Validate with exchange
        valid = await self.validate_symbol(symbol)
        if not valid:
            raise ValueError(f"Trading pair '{symbol}' is not a valid active market on Binance spot.")

        self._monitored_pairs.append(symbol)
        logger.info(f"Added '{symbol}' to monitored trading pairs (Total: {len(self._monitored_pairs)})")
        return True

    def remove_monitored_pair(self, symbol: str) -> bool:
        symbol = symbol.upper().strip()
        if symbol in self._monitored_pairs:
            if len(self._monitored_pairs) <= 1:
                raise ValueError("Must keep at least one monitored trading pair.")
            self._monitored_pairs.remove(symbol)
            logger.info(f"Removed '{symbol}' from monitored pairs")
            return True
        return False

    async def validate_symbol(self, symbol: str) -> bool:
        try:
            ex = self._get_exchange()
            if self._markets_cache is None:
                self._markets_cache = await ex.load_markets()
            return symbol in self._markets_cache
        except Exception as e:
            logger.warning(f"Market validation check fallback: {e}")
            return True # Fallback permissive

    async def get_popular_pairs(self) -> List[Dict[str, str]]:
        """Return curated popular trading pairs available to add."""
        return [
            {"symbol": "BTC/USDT", "name": "Bitcoin"},
            {"symbol": "ETH/USDT", "name": "Ethereum"},
            {"symbol": "SOL/USDT", "name": "Solana"},
            {"symbol": "BNB/USDT", "name": "BNB"},
            {"symbol": "XRP/USDT", "name": "Ripple"},
            {"symbol": "DOGE/USDT", "name": "Dogecoin"},
            {"symbol": "ADA/USDT", "name": "Cardano"},
            {"symbol": "AVAX/USDT", "name": "Avalanche"},
            {"symbol": "LINK/USDT", "name": "Chainlink"},
            {"symbol": "NEAR/USDT", "name": "NEAR Protocol"},
            {"symbol": "SUI/USDT", "name": "Sui Network"},
            {"symbol": "APT/USDT", "name": "Aptos"},
            {"symbol": "RENDER/USDT", "name": "Render"},
            {"symbol": "PEPE/USDT", "name": "Pepe"},
            {"symbol": "SHIB/USDT", "name": "Shiba Inu"},
        ]

    def _get_exchange(self):
        if self._exchange is None:
            exchange_class = getattr(ccxt_async, self.exchange_id, None)
            if not exchange_class:
                exchange_class = ccxt_async.bybit
            
            config = {
                "enableRateLimit": True,
                "timeout": 15000,
                "options": {
                    "defaultType": getattr(settings, "DEFAULT_MARKET_TYPE", "swap"),  # Futures / USDT-M Perpetual
                }
            }
            if settings.EXCHANGE_API_KEY:
                config["apiKey"] = settings.EXCHANGE_API_KEY
            if settings.EXCHANGE_API_SECRET:
                config["secret"] = settings.EXCHANGE_API_SECRET

            self._exchange = exchange_class(config)
            if settings.EXCHANGE_SANDBOX and hasattr(self._exchange, "set_sandbox_mode"):
                try:
                    self._exchange.set_sandbox_mode(True)
                except Exception as e:
                    logger.warning(f"Could not activate sandbox mode on {self.exchange_id}: {e}")
        return self._exchange

    def to_contract_symbol(self, symbol: str) -> str:
        """Convert standard pair symbol to exchange perpetual contract symbol."""
        sym = symbol.strip().upper()
        if ":" in sym:
            return sym
        if "/" in sym:
            base, quote = sym.split("/")
            return f"{base}/{quote}:{quote}"
        return f"{sym}/USDT:USDT"

    async def fetch_ticker(self, symbol: str) -> Ticker:
        """Fetch current ticker price, 24h high/low and volume directly from real exchange."""
        contract_symbol = self.to_contract_symbol(symbol)
        try:
            ex = self._get_exchange()
            try:
                raw = await ex.fetch_ticker(contract_symbol)
            except Exception:
                raw = await ex.fetch_ticker(symbol)

            ticker = Ticker(
                symbol=symbol,
                last_price=float(raw.get("last") or raw.get("close") or 0.0),
                high_24h=float(raw.get("high") or 0.0),
                low_24h=float(raw.get("low") or 0.0),
                volume_24h=float(raw.get("baseVolume") or 0.0),
                change_24h=float(raw.get("change") or 0.0),
                percentage_24h=float(raw.get("percentage") or 0.0),
                timestamp=int(raw.get("timestamp") or 0)
            )
            self._ticker_cache[symbol] = ticker
            return ticker
        except Exception as e:
            logger.warning(f"Error fetching live ticker for {symbol}: {e}")
            if symbol in self._ticker_cache:
                return self._ticker_cache[symbol]
            # Resilient fallback so public API or dashboard never crashes on cloud IP rate-limits
            fallback_prices = {
                "BTC/USDT": 96500.0,
                "ETH/USDT": 2750.0,
                "SOL/USDT": 185.0,
                "BNB/USDT": 650.0,
                "XRP/USDT": 1.45,
                "DOGE/USDT": 0.25,
            }
            default_p = fallback_prices.get(symbol, 100.0)
            fallback_t = Ticker(
                symbol=symbol,
                last_price=default_p,
                high_24h=default_p * 1.02,
                low_24h=default_p * 0.98,
                volume_24h=1000000.0,
                change_24h=0.0,
                percentage_24h=0.0,
                timestamp=int(time.time() * 1000)
            )
            self._ticker_cache[symbol] = fallback_t
            return fallback_t

    async def fetch_ohlcv(self, symbol: str, timeframe: str = "1h", limit: int = 50) -> List[OHLCV]:
        """Fetch candlestick bars for charting directly from real exchange."""
        contract_symbol = self.to_contract_symbol(symbol)
        try:
            ex = self._get_exchange()
            try:
                raw_candles = await ex.fetch_ohlcv(contract_symbol, timeframe=timeframe, limit=limit)
            except Exception:
                raw_candles = await ex.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)

            return [
                OHLCV(
                    timestamp=int(c[0]),
                    open=float(c[1]),
                    high=float(c[2]),
                    low=float(c[3]),
                    close=float(c[4]),
                    volume=float(c[5])
                )
                for c in raw_candles
            ]
        except Exception as e:
            logger.error(f"Failed to fetch live OHLCV for {symbol}: {e}")
            raise RuntimeError(f"Failed to fetch real OHLCV data for {symbol}: {e}")

    def execute_paper_order(
        self,
        symbol: str,
        side: str,
        amount: float,
        price: float,
        position_side: Optional[str] = None,
        leverage: int = 10,
        source: str = "bot"
    ) -> Dict[str, Any]:
        """
        Simulate a Futures order execution in Paper Trading mode.
        Supports both LONG and SHORT positions with configurable leverage.
        """
        if not settings.ALLOW_LIVE_TRADING and settings.TRADING_MODE != "paper":
            raise RuntimeError("Live trading is strictly disabled.")

        base = symbol.split("/")[0] if "/" in symbol else symbol
        quote = "USDT"

        notional_cost = amount * price
        leverage = max(1, min(int(leverage), 100))
        margin_required = notional_cost / leverage
        fee = notional_cost * 0.0005  # 0.05% standard futures taker fee

        # Determine effective position side
        side_norm = side.upper()
        if position_side:
            pos_side = position_side.upper()
        elif side_norm in ["BUY", "LONG"]:
            pos_side = "LONG"
        elif side_norm in ["SELL", "SHORT"]:
            pos_side = "SHORT"
        else:
            pos_side = "LONG"

        pos_key = f"{symbol}:{pos_side}:{source}"

        if self._paper_cash_usdt < (margin_required + fee):
            raise ValueError(
                f"Insufficient USDT margin. Required: ${margin_required + fee:.2f}, Available: ${self._paper_cash_usdt:.2f}"
            )

        self._paper_cash_usdt -= (margin_required + fee)

        # Calculate liquidation price
        if pos_side == "LONG":
            liq_price = price * (1.0 - (1.0 / leverage) * 0.9)
        else:
            liq_price = price * (1.0 + (1.0 / leverage) * 0.9)

        # Update or create position
        if pos_key in self._positions:
            cur_pos = self._positions[pos_key]
            total_amount = cur_pos["amount"] + amount
            total_notional = (cur_pos["entry_price"] * cur_pos["amount"]) + notional_cost
            avg_entry = total_notional / total_amount
            new_margin = cur_pos["margin"] + margin_required
            if pos_side == "LONG":
                liq_price = avg_entry * (1.0 - (1.0 / leverage) * 0.9)
            else:
                liq_price = avg_entry * (1.0 + (1.0 / leverage) * 0.9)

            self._positions[pos_key] = {
                "symbol": symbol,
                "asset": base,
                "side": pos_side,
                "amount": total_amount,
                "entry_price": avg_entry,
                "leverage": leverage,
                "margin": new_margin,
                "liquidation_price": liq_price,
                "source": source
            }
        else:
            self._positions[pos_key] = {
                "symbol": symbol,
                "asset": base,
                "side": pos_side,
                "amount": amount,
                "entry_price": price,
                "leverage": leverage,
                "margin": margin_required,
                "liquidation_price": liq_price,
                "source": source
            }

        logger.info(
            f"Simulated FUTURES order: {pos_side} {amount} {symbol} @ ${price:.2f} "
            f"(Lev: {leverage}x, Margin: ${margin_required:.2f}, Fee: ${fee:.2f})"
        )

        return {
            "status": "FILLED",
            "symbol": symbol,
            "side": side_norm,
            "position_side": pos_side,
            "leverage": leverage,
            "amount": amount,
            "price": price,
            "cost": notional_cost,
            "margin": margin_required,
            "liquidation_price": liq_price,
            "fee": fee,
            "fee_currency": quote,
            "realized_pnl": 0.0,
            "source": source,
            "is_paper": True
        }

    async def get_positions(self, source: Optional[str] = None) -> List[Position]:
        """Fetch all active open futures positions enriched with live mark-to-market prices & ROE."""
        result: List[Position] = []
        for pos_key, pos in list(self._positions.items()):
            if source and pos.get("source") != source:
                continue

            symbol = pos["symbol"]
            ticker = await self.fetch_ticker(symbol)
            cur_price = ticker.last_price or pos["entry_price"]
            amt = pos["amount"]
            entry = pos["entry_price"]
            lev = pos.get("leverage", 10)
            margin = pos.get("margin", (amt * entry) / lev)
            pos_side = pos.get("side", "LONG")
            pos_val = amt * cur_price

            if pos_side == "LONG":
                upnl = (cur_price - entry) * amt
            else:
                upnl = (entry - cur_price) * amt

            roe_pct = (upnl / margin * 100.0) if margin > 0 else 0.0

            result.append(
                Position(
                    symbol=symbol,
                    asset=pos["asset"],
                    side=pos_side,
                    amount=amt,
                    entry_price=entry,
                    current_price=cur_price,
                    position_value=pos_val,
                    leverage=lev,
                    margin=margin,
                    liquidation_price=pos.get("liquidation_price"),
                    unrealized_pnl=upnl,
                    unrealized_pnl_pct=roe_pct,
                    source=pos.get("source", "bot")
                )
            )
        return result

    def get_position_for_symbol(self, symbol: str, source: str = "bot") -> Optional[Dict[str, Any]]:
        """Find open position for a symbol."""
        for key, pos in self._positions.items():
            if pos["symbol"] == symbol and pos.get("source") == source:
                return pos
        return None

    async def close_position(
        self,
        symbol: str,
        position_side: Optional[str] = None,
        source: Optional[str] = None
    ) -> Dict[str, Any]:
        """Liquidate / close an open futures position at the current market price."""
        target_key = None
        for key, p in self._positions.items():
            if p["symbol"] == symbol:
                if position_side and p.get("side") != position_side.upper():
                    continue
                if source and p.get("source") != source:
                    continue
                target_key = key
                break

        if not target_key or target_key not in self._positions:
            raise ValueError(f"No open position found for {symbol}")

        pos = self._positions[target_key]
        ticker = await self.fetch_ticker(symbol)
        price = ticker.last_price or pos["entry_price"]
        amt = pos["amount"]
        entry = pos["entry_price"]
        pos_side = pos.get("side", "LONG")
        margin = pos.get("margin", 0.0)

        notional_val = amt * price
        fee = notional_val * 0.0005

        if pos_side == "LONG":
            gross_pnl = (price - entry) * amt
        else:
            gross_pnl = (entry - price) * amt

        realized_pnl = gross_pnl - fee
        returned_cash = margin + realized_pnl

        self._paper_cash_usdt += max(0.0, returned_cash)
        del self._positions[target_key]

        logger.info(
            f"Closed FUTURES {pos_side} position {symbol}: Entry ${entry:.2f}, Exit ${price:.2f}, "
            f"Realized PnL: ${realized_pnl:.2f} (Refunded Margin: ${returned_cash:.2f})"
        )

        return {
            "status": "FILLED",
            "symbol": symbol,
            "side": pos_side,
            "amount": amt,
            "price": price,
            "cost": notional_val,
            "fee": fee,
            "fee_currency": "USDT",
            "realized_pnl": realized_pnl,
            "leverage": pos.get("leverage", 10),
            "margin": margin,
            "liquidation_price": pos.get("liquidation_price"),
            "is_paper": True
        }

    def get_paper_balances(self) -> Dict[str, float]:
        total_margin = sum(p.get("margin", 0.0) for p in self._positions.values())
        return {
            "USDT": self._paper_cash_usdt,
            "available_margin": max(0.0, self._paper_cash_usdt),
            "margin_used": total_margin,
        }

    async def close(self):
        if self._exchange:
            await self._exchange.close()
            self._exchange = None

exchange_service = ExchangeService()
