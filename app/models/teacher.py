"""
app/models/teacher.py — Teacher Profile & Subject Assignments
"""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Teacher(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "teachers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutions.id"),
        nullable=False, index=True,
    )
    employee_id: Mapped[str | None] = mapped_column(String(50), index=True)
    department: Mapped[str | None] = mapped_column(String(100))
    qualification: Mapped[str | None] = mapped_column(String(255))
    experience_years: Mapped[int | None] = mapped_column()
    bio: Mapped[str | None] = mapped_column(Text)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="teacher_profile")
    subject_assignments: Mapped[list["TeacherSubject"]] = relationship(back_populates="teacher")
    assessments: Mapped[list["Assessment"]] = relationship(back_populates="teacher")

    def __repr__(self) -> str:
        return f"<Teacher emp={self.employee_id!r}>"


class TeacherSubject(UUIDMixin, TimestampMixin, Base):
    """
    Which teacher teaches which subject for which grade/section.
    This is a many-to-many between Teacher and Subject, with grade context.
    """
    __tablename__ = "teacher_subjects"

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    grade: Mapped[str] = mapped_column(String(20), nullable=False)
    section: Mapped[str | None] = mapped_column(String(10))
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)
    is_primary: Mapped[bool] = mapped_column(default=True)  # Primary vs substitute teacher

    teacher: Mapped["Teacher"] = relationship(back_populates="subject_assignments")
    subject: Mapped["Subject"] = relationship(back_populates="teacher_assignments")
