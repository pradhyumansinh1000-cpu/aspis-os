"""
app/models/student.py — Student Profile Extension Model
"""

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin, SoftDeleteMixin


class Student(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "students"

    # 1:1 link to users table
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # ── Academic Info ─────────────────────────────────────────────────────────
    roll_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    grade: Mapped[str] = mapped_column(String(20), nullable=False)       # "10", "12", "Grade 5"
    section: Mapped[str | None] = mapped_column(String(10))              # "A", "B", "Science"
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)  # "2024-25"
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    
    # ── Performance Metadata (cached aggregates, updated by analytics tasks) ──
    # Storing these avoids expensive joins on every dashboard load
    overall_grade_point: Mapped[float | None] = mapped_column()          # GPA equivalent
    attendance_percentage: Mapped[float | None] = mapped_column()
    
    # ── Parent Link & DPDPA Consent ───────────────────────────────────────────
    parent_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    guardian_consent_given: Mapped[bool] = mapped_column(default=False)
    consent_recorded_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(back_populates="student_profile", foreign_keys=[user_id])
    parent: Mapped["User | None"] = relationship(foreign_keys=[parent_user_id])
    scores: Mapped[list["StudentScore"]] = relationship(back_populates="student")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(back_populates="student")
    weak_topics: Mapped[list["WeakTopic"]] = relationship(back_populates="student")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="student")
    ai_reports: Mapped[list["AIReport"]] = relationship(back_populates="student")

    def __repr__(self) -> str:
        return f"<Student roll={self.roll_number!r} grade={self.grade}>"
