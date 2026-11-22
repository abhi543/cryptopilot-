from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "CryptoPilot Backend"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "cryptopilot-dev-secret-key-change-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Database: Supabase PostgreSQL (or fallback to local sqlite+aiosqlite for local dev/testing)
    DATABASE_URL: str = "sqlite+aiosqlite:///./cryptopilot.db"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # CCXT Exchange
    DEFAULT_EXCHANGE: str = "bybit"
    DEFAULT_MARKET_TYPE: str = "swap"  # 'swap' (USDT-M Perpetual Futures) | 'spot'
    DEFAULT_LEVERAGE: int = 10
    EXCHANGE_SANDBOX: bool = False
    EXCHANGE_API_KEY: str = ""
    EXCHANGE_API_SECRET: str = ""
    EXCHANGE_PASSPHRASE: str = ""

    # Futures paper trading mode
    TRADING_MODE: str = "paper"  # 'paper' | 'backtest'
    ALLOW_LIVE_TRADING: bool = False

    # Live feed interval in seconds
    WS_REFRESH_INTERVAL_SEC: float = 2.0
    DEFAULT_TICKERS: List[str] = ["BTC/USDT", "ETH/USDT", "SOL/USDT"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
