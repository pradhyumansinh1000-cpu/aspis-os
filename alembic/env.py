"""
alembic/env.py — Alembic Migration Environment

Configured for async SQLAlchemy with asyncpg.
Uses synchronous psycopg2 for the migration runner itself
(Alembic doesn't support async natively).
"""

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Import all models so Alembic can detect them for autogenerate
from app.models import *  # noqa: F401, F403
from app.database import Base

config = context.config

# Read .env values into Alembic config
config.set_main_option("POSTGRES_USER", os.getenv("POSTGRES_USER", "studentai"))
config.set_main_option("POSTGRES_PASSWORD", os.getenv("POSTGRES_PASSWORD", ""))
config.set_main_option("POSTGRES_HOST", os.getenv("POSTGRES_HOST", "localhost"))
config.set_main_option("POSTGRES_PORT", os.getenv("POSTGRES_PORT", "5432"))
config.set_main_option("POSTGRES_DB", os.getenv("POSTGRES_DB", "studentai_db"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL script)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,      # Detect column type changes
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB (standard mode)."""
    # Use psycopg2 (sync) for Alembic — not asyncpg
    sync_url = config.get_main_option("sqlalchemy.url").replace(
        "postgresql+asyncpg://", "postgresql://"
    )

    connectable = engine_from_config(
        {"sqlalchemy.url": sync_url},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # No connection pooling for migrations
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
