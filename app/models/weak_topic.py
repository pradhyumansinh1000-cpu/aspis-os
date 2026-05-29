"""
app/models/weak_topic.py — Detected Weak Areas Per Student Per Topic
app/models/recommendation.py — Personalized Recommendations
"""

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class WeakTopic(UUIDMixin, TimestampMixin, Base):
    """
    A detected weak area for a student in a specific topic.
    
    Detection logic (in weak_topic_detector.py):
      1. Collect all StudentScore records for a student
      2. Group by topic
      3. Calculate accuracy = sum(marks_obtained) / sum(max_marks) per topic
      4. Topics with accuracy < threshold (e.g., 60%) → weak topic
      5. Llama 70B provides reasoning about why it's weak
    
    severity_score: 0.0 (slightly weak) → 1.0 (critically weak)
    """
    __tablename__ = "weak_topics"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False, index=True
    )

    # Accuracy: 0.0 → 1.0 (e.g., 0.45 = 45% marks obtained on this topic)
    accuracy_score: Mapped[float] = mapped_column(Float, nullable=False)
    severity_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 → 1.0
    
    # Number of assessments this is based on (low count = less reliable)
    data_points: Mapped[int] = mapped_column(Integer, default=1)
    
    # AI-generated explanation
    ai_reasoning: Mapped[str | None] = mapped_column(Text)
    
    # Status tracking
    is_resolved: Mapped[bool] = mapped_column(default=False)

    student: Mapped["Student"] = relationship(back_populates="weak_topics")
    topic: Mapped["Topic"] = relationship(back_populates="weak_topic_records")

    def __repr__(self) -> str:
        return f"<WeakTopic accuracy={self.accuracy_score:.2f} severity={self.severity_score:.2f}>"
