"""
app/models/intelligence_profile.py — Student Digital Intelligence Profile
app/models/risk_prediction.py — ML-Based Risk Predictions

These are the OUTPUT models — they store computed results, not raw inputs.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class StudentIntelligenceProfile(UUIDMixin, TimestampMixin, Base):
    """
    The master "Student Digital Intelligence Profile" — a cached snapshot
    of the full multi-domain analysis for one student.
    
    Rebuilt by Celery tasks whenever:
      - New scores are entered
      - New behavioral records added
      - Health/sports records updated
      - Weekly scheduled recompute
    
    profile_data JSONB structure:
    {
      "academic": {
        "overall_score": 72.4,
        "subject_performances": [...],
        "topic_mastery_map": {"uuid": 0.85, ...},
        "consistency_score": 6.8,
        "theory_vs_application_gap": -12.3,
        "mistake_profile": {"careless_pct": 35, "conceptual_pct": 65}
      },
      "behavioral": {
        "participation_avg": 7.2,
        "leadership_score": 6.5,
        "assignment_consistency": 5.8,
        "learning_style": "visual",
        "confidence_index": 6.9,
        "behavioral_trend": "improving"
      },
      "sports": {
        "active_sports": ["Cricket", "Swimming"],
        "fitness_score": 78,
        "leadership_in_sport": true,
        "stress_resilience": 7.4
      },
      "health": {
        "absences_last_year": 8,
        "exam_period_absences": 3,
        "vision_flag": false,
        "attention_pattern": "normal",
        "health_risk_score": 2.1
      },
      "cross_domain_correlations": {
        "sports_discipline_r": 0.72,
        "health_performance_r": -0.61,
        "participation_grades_r": 0.55
      },
      "overall_risk_score": 34.5,
      "risk_level": "medium",
      "top_strengths": ["Physics theory", "Leadership", "Team sports"],
      "top_concerns": ["Algebra application", "Assignment consistency", "Exam-period health"]
    }
    """
    __tablename__ = "student_intelligence_profiles"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"),
        unique=True, nullable=False, index=True,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False
    )

    # The full computed profile
    profile_data: Mapped[dict | None] = mapped_column(JSONB)

    # Student Knowledge Graph serialized as node/edge JSON
    # Can be loaded back into NetworkX for graph operations
    knowledge_graph: Mapped[dict | None] = mapped_column(JSONB)

    # Future risk impact chains
    # [{"from_topic": "Fractions", "to_topic": "Algebra", "grade": "8", "impact": 0.87}, ...]
    future_impact_chains: Mapped[list | None] = mapped_column(JSONB)

    # Computed at timestamp (for staleness check)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    # Which version of the analytics engine computed this
    engine_version: Mapped[str] = mapped_column(String(50), default="1.0.0")

    # Quick-access cached fields (avoid parsing full JSONB for lists)
    overall_risk_score: Mapped[float | None] = mapped_column(Float)
    risk_level: Mapped[RiskLevel | None] = mapped_column(Enum(RiskLevel))

    student: Mapped["Student"] = relationship()

    def is_stale(self, max_age_hours: int = 24) -> bool:
        """Check if profile needs rebuilding."""
        age = datetime.now(timezone.utc) - self.computed_at
        return age.total_seconds() > max_age_hours * 3600


class RiskPrediction(UUIDMixin, TimestampMixin, Base):
    """
    ML model output: risk prediction per student per subject.
    
    Separate from the intelligence profile so we can:
    - Version risk predictions independently
    - Track prediction accuracy over time
    - Store multiple predictions (one per model version)
    
    risk_factors JSONB:
    {
      "top_factors": [
        {"factor": "weak_prerequisite_topics", "importance": 0.35},
        {"factor": "low_attendance", "importance": 0.22},
        {"factor": "declining_trend", "importance": 0.18}
      ],
      "feature_values": {
        "avg_topic_accuracy": 0.45,
        "attendance_pct": 62.0,
        ...
      }
    }
    """
    __tablename__ = "risk_predictions"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True
    )

    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), nullable=False, index=True)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0–100
    confidence: Mapped[float] = mapped_column(Float, nullable=False)  # 0–1

    risk_factors: Mapped[dict | None] = mapped_column(JSONB)
    predicted_impact_topics: Mapped[list | None] = mapped_column(JSONB)
    # ["Algebra Grade 8", "Coordinate Geometry Grade 9", ...]

    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    predicted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    student: Mapped["Student"] = relationship()

    def __repr__(self) -> str:
        return f"<RiskPrediction {self.risk_level.value} score={self.risk_score:.1f}>"
