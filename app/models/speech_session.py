"""
app/models/speech_session.py — Classroom Audio Analysis
"""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class SpeechStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class SpeechSession(UUIDMixin, TimestampMixin, Base):
    """
    A classroom audio recording session.
    
    Processing pipeline:
      1. Teacher uploads audio (MP3/WAV/M4A, up to 3 hours)
      2. Celery: Whisper STT → full transcript with timestamps
      3. Llama 70B analyzes transcript for:
         - Topics covered
         - Student engagement indicators
         - Questions asked by students
         - Difficult concepts mentioned
      4. Insights stored in JSONB
      5. Attendance can be optionally marked from voice roll-call detection
    """
    __tablename__ = "speech_sessions"

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True
    )

    session_date: Mapped[str] = mapped_column(String(20), nullable=False)  # "2024-11-15"
    grade: Mapped[str] = mapped_column(String(20), nullable=False)

    # Audio file
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)

    # Whisper output
    status: Mapped[SpeechStatus] = mapped_column(Enum(SpeechStatus), default=SpeechStatus.UPLOADED)
    transcript: Mapped[str | None] = mapped_column(Text)
    whisper_model_used: Mapped[str | None] = mapped_column(String(50))  # "base", "large"
    
    # Structured insights from Llama 70B analysis
    # {
    #   "topics_covered": ["Newton's laws", "Friction"],
    #   "student_questions": ["What is inertia?", ...],
    #   "difficult_concepts": ["Conservation of momentum"],
    #   "engagement_score": 7.2,
    #   "summary": "..."
    # }
    insights: Mapped[dict | None] = mapped_column(JSONB)
    
    # Celery task metadata
    task_id: Mapped[str | None] = mapped_column(String(255))
    error_message: Mapped[str | None] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<SpeechSession {self.session_date} [{self.status.value}]>"
