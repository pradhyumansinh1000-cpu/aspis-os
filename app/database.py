"""
app/database.py — Async SQLAlchemy Database Engine

Why async?
  - FastAPI is fully async. Using asyncpg + async SQLAlchemy means DB queries
    never block the event loop — critical for high concurrency.
  - Connection pooling (pool_size=20) means we reuse connections efficiently,
    avoiding the expensive cost of creating new DB connections per request.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# ─── Engine ───────────────────────────────────────────────────────────────────
# pool_size: persistent connections kept open (prevents cold-start latency)
# max_overflow: extra connections allowed when pool is exhausted
# pool_pre_ping: sends a lightweight ping before using a connection (handles
#               stale connections after DB restarts)
# echo: set True only in debug — logs every SQL statement
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,       # Recycle connections older than 1 hour
    echo=settings.DEBUG,
)

# ─── Session Factory ──────────────────────────────────────────────────────────
# expire_on_commit=False: after commit, objects stay accessible without
# triggering a new lazy-load query. Critical for async — lazy loads don't
# work across awaits in async SQLAlchemy.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ─── Base Model ───────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """
    All ORM models inherit from this Base.
    Provides metadata for Alembic migrations and SQLAlchemy table creation.
    """
    pass


# ─── Dependency ───────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a database session.
    The session is automatically closed (and the connection returned to the
    pool) when the request finishes — even if an exception is raised.

    Usage in routes:
        @router.get("/")
        async def my_route(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager version of get_db() for use in Celery tasks,
    startup events, and anywhere outside a FastAPI request context.

    Usage:
        async with get_db_context() as db:
            result = await db.execute(...)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Creates all tables from SQLAlchemy models.
    Only used in development/testing. In production, use Alembic migrations.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose engine (close all connections). Called on app shutdown."""
    await engine.dispose()
