"""
app/models/user.py — Unified User Model with Role-Based Access

Single users table for all roles (student/teacher/parent/admin).
Why unified?
  - Simpler auth: one login flow, one JWT structure
  - Roles can change (a teacher may also be a parent)
  - Easier cross-role notifications

The Student/Teacher models are extension tables (1:1 linked via user_id)
containing role-specific data.
"""

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDMixin


class UserRole(str, enum.Enum):
    """
    Using str + enum.Enum means values serialize to plain strings in JSON
    automatically — no custom serializer needed.
    """
    STUDENT = "student"
    TEACHER = "teacher"
    PARENT = "parent"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"  # Platform-level admin (us)
    MEDICAL_STAFF = "medical_staff"  # Nurse, doctor, counsellor


class User(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "users"

    # ── Identity ──────────────────────────────────────────────────────────────
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    
    # ── Auth ──────────────────────────────────────────────────────────────────
    # Stored as Argon2 hash — never store plaintext passwords
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # ── Profile ───────────────────────────────────────────────────────────────
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    
    # ── Role & Tenant ─────────────────────────────────────────────────────────
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, index=True)
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    institution: Mapped["Institution"] = relationship(back_populates="users")
    student_profile: Mapped["Student | None"] = relationship(
        back_populates="user", uselist=False
    )
    teacher_profile: Mapped["Teacher | None"] = relationship(
        back_populates="user", uselist=False
    )

    # ── Convenience ───────────────────────────────────────────────────────────
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def is_teacher(self) -> bool:
        return self.role == UserRole.TEACHER

    @property
    def is_student(self) -> bool:
        return self.role == UserRole.STUDENT

    def __repr__(self) -> str:
        return f"<User {self.email!r} [{self.role.value}]>"
