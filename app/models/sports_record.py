"""
app/models/sports_record.py — Sports & Physical Activity Profile

Sports data reveals things academic marks can't:
  - Stamina and stress resilience
  - Team leadership vs individual performance
  - Physical health correlation with academic performance

Key insight: Students excelling in team sports often have better
collaboration scores and stress tolerance during exams.
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class SportType(str, enum.Enum):
    TEAM = "team"           # Cricket, Football, Basketball, Volleyball
    INDIVIDUAL = "individual"  # Swimming, Athletics, Badminton, Chess
    MARTIAL_ARTS = "martial_arts"
    INDOOR = "indoor"
    FITNESS = "fitness"     # General PT, yoga, gym


class ParticipationLevel(str, enum.Enum):
    RECREATIONAL = "recreational"  # Casual participation
    SCHOOL_TEAM = "school_team"
    DISTRICT = "district"
    STATE = "state"
    NATIONAL = "national"


class SportsRecord(UUIDMixin, TimestampMixin, Base):
    """
    Sports and physical activity record per student per year.
    One record per sport per academic year.
    """
    __tablename__ = "sports_records"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)

    # ── Sport Info ────────────────────────────────────────────────────────────
    sport_name: Mapped[str] = mapped_column(String(100), nullable=False)
    sport_type: Mapped[SportType] = mapped_column(Enum(SportType), default=SportType.TEAM)
    participation_level: Mapped[ParticipationLevel] = mapped_column(
        Enum(ParticipationLevel), default=ParticipationLevel.SCHOOL_TEAM
    )

    # ── Participation Metrics ─────────────────────────────────────────────────
    sessions_total: Mapped[int] = mapped_column(Integer, default=0)
    sessions_attended: Mapped[int] = mapped_column(Integer, default=0)

    @property
    def attendance_pct(self) -> float:
        return (self.sessions_attended / self.sessions_total * 100) if self.sessions_total > 0 else 0.0

    # ── Performance ───────────────────────────────────────────────────────────
    is_team_captain: Mapped[bool] = mapped_column(Boolean, default=False)
    competition_participated: Mapped[bool] = mapped_column(Boolean, default=False)
    competition_result: Mapped[str | None] = mapped_column(String(200))
    # e.g., "District Level - 2nd Place", "School Champion"

    performance_rating: Mapped[float | None] = mapped_column(Float)
    # 0.0–10.0, given by sports teacher

    # ── Physical Fitness Metrics ───────────────────────────────────────────────
    # Standardized annual fitness test results
    fitness_score: Mapped[float | None] = mapped_column(Float)  # 0–100 composite
    bmi_category: Mapped[str | None] = mapped_column(String(30))  # Underweight/Normal/Overweight
    stamina_rating: Mapped[float | None] = mapped_column(Float)   # 0–10
    strength_rating: Mapped[float | None] = mapped_column(Float)  # 0–10

    # ── AI-derived flags ──────────────────────────────────────────────────────
    shows_leadership_in_sport: Mapped[bool] = mapped_column(Boolean, default=False)
    stress_resilience_indicator: Mapped[float | None] = mapped_column(Float)
    # Derived: students who maintain sports during exam season → high resilience

    notes: Mapped[str | None] = mapped_column(Text)

    student: Mapped["Student"] = relationship()

    def __repr__(self) -> str:
        return f"<SportsRecord {self.sport_name} [{self.academic_year}]>"
