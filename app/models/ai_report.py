"""
app/models/ai_report.py — AI-Generated Report Storage

Reports are generated asynchronously by Llama 70B.
The JSONB content field stores the structured AI output:
{
  "summary": "...",
  "strengths": [...],
  "weak_areas": [...],
  "recommendations": [...],
  "trend": "improving",
  "predicted_score": 82.5
}

Storing raw AI output as JSONB lets us:
  - Render reports without re-generating them
  - Version reports when the AI model changes
  - Run analytics on AI outputs across students
"""

import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class ReportType(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ASSESSMENT = "assessment"        # Post-exam report
    SEMESTER = "semester"
    PARENT_SUMMARY = "parent_summary"
    TEACHER_INSIGHT = "teacher_insight"


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AIReport(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_reports"

    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=True, index=True
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    assessment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=True
    )

    report_type: Mapped[ReportType] = mapped_column(Enum(ReportType), nullable=False, index=True)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.PENDING)
    
    # AI-generated structured content
    content: Mapped[dict | None] = mapped_column(JSONB)
    
    # Raw Llama output (for debugging and model comparison)
    raw_llm_output: Mapped[str | None] = mapped_column(Text)
    
    # Model versioning — helps compare outputs across model updates
    model_version: Mapped[str | None] = mapped_column(String(100))  # "llama3:70b"
    
    # Processing metrics
    generation_time_ms: Mapped[int | None] = mapped_column()
    token_count: Mapped[int | None] = mapped_column()
    
    # Celery task ID for polling status
    task_id: Mapped[str | None] = mapped_column(String(255))
    error_message: Mapped[str | None] = mapped_column(Text)

    student: Mapped["Student | None"] = relationship(back_populates="ai_reports")

    def __repr__(self) -> str:
        return f"<AIReport {self.report_type.value} [{self.status.value}]>"
