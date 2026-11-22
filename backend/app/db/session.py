import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.base import Base

def get_engine_url(url: str) -> str:
    # On Vercel, if default SQLite is used, store in writable /tmp
    if os.environ.get("VERCEL") and "cryptopilot.db" in url and not url.startswith("sqlite+aiosqlite:////tmp/"):
        return "sqlite+aiosqlite:////tmp/cryptopilot.db"
    # Standardize url for async drivers
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    return url

db_url = get_engine_url(settings.DATABASE_URL)

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    # SQLite connection args if sqlite
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def init_db() -> None:
    """Initialize database tables."""
    try:
        async with engine.begin() as conn:
            # Import models to ensure they are registered with Base.metadata
            import backend.app.models  # noqa
            await conn.run_sync(Base.metadata.create_all)
        logger.info(f"Database initialized successfully with URL: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        raise

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
