"""
app/models/institution.py — Multi-tenant Institution Model

Every institution (school/college) is fully isolated. All other records
have an institution_id foreign key — this is the foundation of multi-tenancy.

Design: Single-DB multi-tenancy via institution_id (simpler than schema-per-tenant,
good enough for thousands of institutions, easy to query across them for admin).
"""

import uuid

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDMixin


class Institution(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "institutions"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), default="India")
    
    # Subscription & feature flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_students: Mapped[int] = mapped_column(Integer, default=500)
    
    # Plan tier for feature gating
    plan: Mapped[str] = mapped_column(
        String(50), default="basic"  # basic | professional | enterprise
    )

    # Relationships (back-populated from child models)
    users: Mapped[list["User"]] = relationship(back_populates="institution")
    subjects: Mapped[list["Subject"]] = relationship(back_populates="institution")

    def __repr__(self) -> str:
        return f"<Institution {self.name!r} ({self.slug})>"
