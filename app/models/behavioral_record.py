"""
app/models/behavioral_record.py — Student Behavioral Profile

Behavioral data is the most underused signal in education analytics.
A student who participates confidently but submits assignments inconsistently
has a VERY different problem than one who is consistently disengaged.

Design:
  - `BehavioralRecord`: One observation entry (filled by teacher, weekly/monthly)
  - `BehavioralProfile`: Aggregated snapshot (computed, cached)

Score scale: 0.0–10.0 for all numeric fields.
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class ObservationType(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    INCIDENT = "incident"       # Specific event (positive or negative)
    ASSESSMENT = "assessment"   # Post-exam behavioral note


class IncidentSeverity(str, enum.Enum):
    POSITIVE = "positive"       # Achievement, praise
    MINOR = "minor"             # Small disruption
    MODERATE = "moderate"       # Repeated behavior
    SERIOUS = "serious"         # Requires counseling


class LearningStyle(str, enum.Enum):
    VISUAL = "visual"
    AUDITORY = "auditory"
    KINESTHETIC = "kinesthetic"
    READING_WRITING = "reading_writing"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class BehavioralRecord(UUIDMixin, TimestampMixin, Base):
    """
    A single behavioral observation by a teacher.
    Stored as fine-grained records → aggregated by analytics engine.
    
    Why per-observation (not a single profile record)?
    → We can track behavioral trends over time, not just snapshots.
    → A student who improves from 4→8 participation needs different treatment
      than one stuck at 4.
    """
    __tablename__ = "behavioral_records"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    observer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    observation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    observation_type: Mapped[ObservationType] = mapped_column(
        Enum(ObservationType), default=ObservationType.WEEKLY
    )
    subject_context: Mapped[str | None] = mapped_column(String(100))  # Which class

    # ── Core Behavioral Scores (0.0–10.0) ────────────────────────────────────
    participation_score: Mapped[float | None] = mapped_column(Float)
    # How actively does the student engage in class discussion?

    assignment_consistency: Mapped[float | None] = mapped_column(Float)
    # Timely submission rate, quality consistency

    communication_score: Mapped[float | None] = mapped_column(Float)
    # Clarity when answering, asking questions, group discussions

    teamwork_score: Mapped[float | None] = mapped_column(Float)
    # Collaboration in group activities

    leadership_score: Mapped[float | None] = mapped_column(Float)
    # Initiative-taking, helping peers, leading activities

    creativity_score: Mapped[float | None] = mapped_column(Float)
    # Original thinking, outside-the-box answers

    self_discipline_score: Mapped[float | None] = mapped_column(Float)
    # Punctuality, focus, following instructions without prompting

    # ── Incident-specific fields (when type=INCIDENT) ─────────────────────────
    incident_severity: Mapped[IncidentSeverity | None] = mapped_column(Enum(IncidentSeverity))
    incident_description: Mapped[str | None] = mapped_column(Text)
    action_taken: Mapped[str | None] = mapped_column(String(500))

    # ── Learning Style (teacher's observed assessment) ────────────────────────
    observed_learning_style: Mapped[LearningStyle | None] = mapped_column(Enum(LearningStyle))

    notes: Mapped[str | None] = mapped_column(Text)

    student: Mapped["Student"] = relationship()

    def __repr__(self) -> str:
        return f"<BehavioralRecord student={self.student_id} date={self.observation_date}>"
