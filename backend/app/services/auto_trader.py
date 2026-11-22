import asyncio
import time
from typing import Dict, Any, Optional
from sqlalchemy import select
from backend.app.db.session import AsyncSessionLocal
from backend.app.models.trade import Trade
from backend.app.models.strategy import Strategy
from backend.app.schemas.signal import SignalCreate
from backend.app.services.exchange_service import exchange_service
from backend.app.core.logging import logger

class AutoTraderEngine:
    """
    Autonomous Execution Engine for continuous multi-pair algorithmic trading.
    
    When started, trades across ALL monitored pairs simultaneously (BTC, ETH, SOL, BNB, XRP, DOGE...),
    entering on dips/momentum and harvesting take-profit gains autonomously.
    """

    def __init__(self):
        self.enabled: bool = True
        self.cooldown_sec: float = 20.0  # 20s cooldown per pair to avoid rapid order spam
        self._last_trade_time: Dict[str, float] = {}
        self._price_history: Dict[str, List[float]] = {}
        self.total_auto_trades: int = 0
        self._broadcaster = None

    def set_broadcaster(self, broadcaster):
        self._broadcaster = broadcaster

    async def evaluate_ticker(self, ticker: Dict[str, Any]):
        """
        Universal Multi-Pair Autonomous Engine:
        Evaluates real-time price action across ALL monitored cryptocurrency pairs.
        """
        if not self.enabled:
            return

        symbol = ticker.get("symbol")
        price = ticker.get("last_price")
        if not symbol or not price or price <= 0:
            return

        now = time.time()
        last_time = self._last_trade_time.get(symbol, 0.0)
        if (now - last_time) < self.cooldown_sec:
            return

        # Maintain rolling price history per pair
        if symbol not in self._price_history:
            self._price_history[symbol] = []
        self._price_history[symbol].append(price)
        if len(self._price_history[symbol]) > 15:
            self._price_history[symbol].pop(0)

        history = self._price_history[symbol]
        if len(history) < 2:
            return

        # Check if an open position already exists for this pair
        pos = exchange_service.get_position_for_symbol(symbol, source="bot")
        signal = None

        if not pos:
            # Multi-Pair Autonomous Futures Strategy:
            # Open LONG on dips, Open SHORT on rallies/exhaustion
            avg_price = sum(history) / len(history)
            price_change = ((price - history[0]) / history[0]) * 100.0

            if price <= avg_price * 0.9995:
                signal = SignalCreate(
                    strategy_id="multi-pair-auto",
                    symbol=symbol,
                    signal_type="BUY",
                    price=price,
                    confidence=0.88,
                    reason=f"Futures Bot: Dip Long entry on {symbol} @ ${price:,.2f} (10x Leverage)"
                )
            elif price >= avg_price * 1.0008:
                signal = SignalCreate(
                    strategy_id="multi-pair-auto",
                    symbol=symbol,
                    signal_type="SELL",
                    price=price,
                    confidence=0.87,
                    reason=f"Futures Bot: Overbought Short entry on {symbol} @ ${price:,.2f} (10x Leverage)"
                )
        else:
            # Exit / Take-Profit / Stop-Loss condition based on ROE
            entry_price = pos["entry_price"]
            pos_side = pos.get("side", "LONG")
            leverage = pos.get("leverage", 10)

            if pos_side == "LONG":
                pnl_pct = ((price - entry_price) / entry_price) * 100.0
            else:
                pnl_pct = ((entry_price - price) / entry_price) * 100.0

            roe_pct = pnl_pct * leverage

            # Take profit at +3.0% ROE or cut loss at -6.0% ROE
            if roe_pct >= 3.0:
                signal = SignalCreate(
                    strategy_id="multi-pair-auto",
                    symbol=symbol,
                    signal_type="CLOSE",
                    price=price,
                    confidence=0.92,
                    reason=f"Futures Bot: Take-Profit locked +{roe_pct:.2f}% ROE on {pos_side} {symbol}"
                )
            elif roe_pct <= -6.0:
                signal = SignalCreate(
                    strategy_id="multi-pair-auto",
                    symbol=symbol,
                    signal_type="CLOSE",
                    price=price,
                    confidence=0.85,
                    reason=f"Futures Bot: Stop-Loss executed {roe_pct:.2f}% ROE on {pos_side} {symbol}"
                )

        if signal:
            await self.handle_signal(signal)

    async def handle_signal(self, signal: SignalCreate) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None

        now = time.time()
        last_time = self._last_trade_time.get(signal.symbol, 0.0)
        if (now - last_time) < self.cooldown_sec:
            logger.debug(f"AutoTrader: Skipping signal for {signal.symbol} (cooldown {self.cooldown_sec}s active)")
            return None

        try:
            ticker = await exchange_service.fetch_ticker(signal.symbol)
            live_price = ticker.last_price or signal.price
        except Exception as e:
            logger.warning(f"AutoTrader: Could not get live price for {signal.symbol}: {e}")
            live_price = signal.price

        if not live_price or live_price <= 0:
            return None

        trade_usd = 200.0  # $200 notional allocation per futures trade
        if signal.metadata_json and "investment_per_grid" in signal.metadata_json:
            trade_usd = float(signal.metadata_json["investment_per_grid"])
        
        amount = round(trade_usd / live_price, 5)
        if amount <= 0:
            amount = 0.001

        side = signal.signal_type.upper()

        # Execute simulated futures order or close position
        try:
            if side == "CLOSE":
                sim_result = await exchange_service.close_position(symbol=signal.symbol, source="bot")
            else:
                sim_result = exchange_service.execute_paper_order(
                    symbol=signal.symbol,
                    side=side,
                    amount=amount,
                    price=live_price,
                    leverage=10,
                    source="bot"
                )
        except Exception as e:
            logger.warning(f"AutoTrader: Execution skipped ({e})")
            return None

        self._last_trade_time[signal.symbol] = now
        self.total_auto_trades += 1

        # Persist trade record in database
        trade_id = None
        try:
            async with AsyncSessionLocal() as session:
                strat_stmt = select(Strategy).where(Strategy.id == signal.strategy_id)
                strat_res = await session.execute(strat_stmt)
                strat = strat_res.scalar_one_or_none()

                db_trade = Trade(
                    strategy_id=signal.strategy_id,
                    symbol=signal.symbol,
                    side=side if side != "CLOSE" else ("SELL" if sim_result.get("side") == "LONG" else "BUY"),
                    position_side=sim_result.get("position_side", sim_result.get("side", "LONG")),
                    leverage=sim_result.get("leverage", 10),
                    margin=sim_result.get("margin", 0.0),
                    liquidation_price=sim_result.get("liquidation_price"),
                    order_type="MARKET",
                    price=live_price,
                    amount=sim_result["amount"],
                    cost=sim_result["cost"],
                    fee=sim_result["fee"],
                    fee_currency=sim_result["fee_currency"],
                    realized_pnl=sim_result.get("realized_pnl", 0.0),
                    status="FILLED",
                    exchange="bybit",
                    source="bot",
                    is_paper=True
                )
                session.add(db_trade)
                if strat:
                    strat.total_pnl += sim_result.get("realized_pnl", 0.0)
                await session.commit()
                trade_id = db_trade.id
        except Exception as e:
            logger.error(f"AutoTrader: Failed to persist trade record: {e}")

        logger.info(f"⚡ FUTURES AUTOTRADER: {side} {sim_result.get('position_side', '')} {signal.symbol} @ ${live_price:.2f} ({signal.reason})")

        # Broadcast live trade update to all connected WebSocket clients
        if self._broadcaster:
            trade_payload = {
                "id": trade_id,
                "strategy_id": signal.strategy_id,
                "symbol": signal.symbol,
                "side": side,
                "price": live_price,
                "amount": amount,
                "cost": sim_result["cost"],
                "fee": sim_result["fee"],
                "reason": signal.reason,
                "is_paper": True,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            await self._broadcaster.broadcast_json({
                "type": "TRADE_EXECUTED",
                "data": trade_payload
            })
            # Also broadcast updated positions
            positions = await exchange_service.get_positions()
            await self._broadcaster.broadcast_json({
                "type": "POSITIONS_UPDATE",
                "data": [p.model_dump() for p in positions]
            })

        return sim_result

auto_trader = AutoTraderEngine()
