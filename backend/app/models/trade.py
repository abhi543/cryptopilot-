import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Float, ForeignKey, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base

class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    strategy_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("strategies.id", ondelete="CASCADE"), nullable=True, index=True
    )
    signal_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("signals.id", ondelete="SET NULL"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(20), default="bot", nullable=False, index=True) # 'bot' | 'manual'
    symbol: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    side: Mapped[str] = mapped_column(String(10), nullable=False) # 'BUY', 'SELL'
    position_side: Mapped[Optional[str]] = mapped_column(String(10), default="LONG", nullable=True) # 'LONG' | 'SHORT'
    leverage: Mapped[Optional[int]] = mapped_column(Integer, default=10, nullable=True)
    margin: Mapped[Optional[float]] = mapped_column(Float, default=0.0, nullable=True)
    liquidation_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    order_type: Mapped[str] = mapped_column(String(20), default="MARKET", nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    cost: Mapped[float] = mapped_column(Float, nullable=False) # price * amount
    fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fee_currency: Mapped[str] = mapped_column(String(10), default="USDT", nullable=False)
    realized_pnl: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="FILLED", nullable=False) # 'OPEN', 'FILLED', 'CANCELLED'
    exchange: Mapped[str] = mapped_column(String(50), default="binance", nullable=False)
    external_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_paper: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    strategy = relationship("Strategy", back_populates="trades")
    signal = relationship("Signal", back_populates="trades")
