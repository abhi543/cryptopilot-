import uuid
from datetime import datetime
from sqlalchemy import String, Float, BigInteger, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base

class MarketCandle(Base):
    """
    Historical OHLCV candle storage with strict duplicate prevention.
    """
    __tablename__ = "market_candles"
    __table_args__ = (
        UniqueConstraint("symbol", "timeframe", "timestamp", name="uq_candle_symbol_timeframe_timestamp"),
        Index("idx_candle_lookup", "symbol", "timeframe", "timestamp"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    symbol: Mapped[str] = mapped_column(String(30), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False) # '5m', '15m', '1h', '4h', '1d'
    timestamp: Mapped[int] = mapped_column(BigInteger, nullable=False) # Unix epoch ms
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
