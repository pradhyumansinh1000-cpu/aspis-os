"""
app/models/attendance.py — Attendance Tracking

Two levels:
  - AttendanceSession: A class session (date + subject + period)
  - AttendanceRecord: Individual student presence for that session

This schema supports:
  - Period-wise attendance (not just daily)
  - Absence reason tracking
  - Attendance percentage calculation per subject
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, ForeignKey, String, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class SessionType(str, enum.Enum):
    LECTURE = "lecture"
    LAB = "lab"
    TUTORIAL = "tutorial"
    SEMINAR = "seminar"


class AbsenceReason(str, enum.Enum):
    MEDICAL = "medical"
    FAMILY = "family"
    UNEXCUSED = "unexcused"
    HOLIDAY = "holiday"
    OTHER = "other"


class AttendanceSession(UUIDMixin, TimestampMixin, Base):
    """Represents one class period."""
    __tablename__ = "attendance_sessions"

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False, index=True
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False, index=True
    )
    # If session was captured via speech analysis
    speech_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("speech_sessions.id"), nullable=True
    )

    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    session_type: Mapped[SessionType] = mapped_column(Enum(SessionType), default=SessionType.LECTURE)
    grade: Mapped[str] = mapped_column(String(20), nullable=False)
    section: Mapped[str | None] = mapped_column(String(10))
    period_number: Mapped[int | None] = mapped_column()
    start_time: Mapped[str | None] = mapped_column(String(10))  # "09:00"
    end_time: Mapped[str | None] = mapped_column(String(10))    # "09:45"
    notes: Mapped[str | None] = mapped_column(Text)

    records: Mapped[list["AttendanceRecord"]] = relationship(back_populates="session")

    def __repr__(self) -> str:
        return f"<AttendanceSession {self.session_date} period={self.period_number}>"


class AttendanceRecord(UUIDMixin, TimestampMixin, Base):
    """Individual student attendance for one session."""
    __tablename__ = "attendance_records"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )

    is_present: Mapped[bool] = mapped_column(Boolean, nullable=False)
    absence_reason: Mapped[AbsenceReason | None] = mapped_column(Enum(AbsenceReason))
    is_late: Mapped[bool] = mapped_column(Boolean, default=False)
    minutes_late: Mapped[int | None] = mapped_column()
    remarks: Mapped[str | None] = mapped_column(String(500))
    marked_by_ai: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped["AttendanceSession"] = relationship(back_populates="records")
    student: Mapped["Student"] = relationship(back_populates="attendance_records")
