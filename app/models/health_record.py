"""
app/models/health_record.py — Health & Wellness Records

Health data is sensitive (HIPAA/FERPA equivalent in education).
Store only what is academically relevant — not medical diagnosis.

Focus: how health factors impact learning capacity.

Key correlations to detect:
  - Frequent absences in exam month → chronic illness or anxiety
  - Vision flag + declining math → undetected vision issue
  - Fatigue pattern → sleep/stress → exam performance dip
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class HealthEventType(str, enum.Enum):
    MEDICAL_ABSENCE = "medical_absence"      # Absent due to illness
    SCREENING_RESULT = "screening_result"    # Vision, hearing, BMI check
    TEACHER_OBSERVATION = "teacher_observation"  # Fatigue, headache noted
    NURSE_VISIT = "nurse_visit"             # Visited school nurse
    CHRONIC_FLAG = "chronic_flag"           # Long-term condition flag


class AttentionPattern(str, enum.Enum):
    NORMAL = "normal"
    OCCASIONAL_FATIGUE = "occasional_fatigue"
    FREQUENT_DISTRACTION = "frequent_distraction"
    FOCUS_DIFFICULTIES = "focus_difficulties"
    HYPERACTIVE = "hyperactive"
    ANXIETY_SIGNS = "anxiety_signs"


class HealthRecord(UUIDMixin, TimestampMixin, Base):
    """
    Health-related records linked to a student.
    
    Privacy design:
    - No diagnosis names stored (only category and academic impact)
    - No medication records
    - Only academically-relevant observations
    """
    __tablename__ = "health_records"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    recorded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    event_type: Mapped[HealthEventType] = mapped_column(Enum(HealthEventType), nullable=False)

    # ── Impact Assessment ─────────────────────────────────────────────────────
    affects_attendance: Mapped[bool] = mapped_column(Boolean, default=False)
    affects_concentration: Mapped[bool] = mapped_column(Boolean, default=False)
    duration_days: Mapped[int | None] = mapped_column(Integer)

    # ── Screening Results (when event_type=SCREENING_RESULT) ──────────────────
    vision_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    hearing_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    nutritional_concern: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Attention & Focus Observations ────────────────────────────────────────
    attention_pattern: Mapped[AttentionPattern | None] = mapped_column(Enum(AttentionPattern))
    fatigue_level: Mapped[int | None] = mapped_column(Integer)  # 1–5 scale

    # ── Exam Period Flag ──────────────────────────────────────────────────────
    # True if this record falls within 2 weeks of an assessment
    during_exam_period: Mapped[bool] = mapped_column(Boolean, default=False)

    notes: Mapped[str | None] = mapped_column(Text)

    student: Mapped["Student"] = relationship()

    def __repr__(self) -> str:
        return f"<HealthRecord {self.event_type.value} [{self.record_date}]>"
