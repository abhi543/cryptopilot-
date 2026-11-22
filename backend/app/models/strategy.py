import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base

class Strategy(Base):
    __tablename__ = "strategies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    strategy_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # 'grid', 'trend', 'breakout'
    symbol: Mapped[str] = mapped_column(String(30), nullable=False, index=True) # e.g. "BTC/USDT"
    status: Mapped[str] = mapped_column(String(30), default="draft", nullable=False, index=True) # 'active', 'paused', 'stopped', 'draft'
    parameters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    allocated_capital: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_capital: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_pnl: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    win_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="strategies")
    signals = relationship("Signal", back_populates="strategy", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="strategy", cascade="all, delete-orphan")
    performances = relationship("PerformanceRecord", back_populates="strategy", cascade="all, delete-orphan")
