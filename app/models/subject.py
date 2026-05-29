"""
app/models/subject.py — Subject & Topic Taxonomy

Topics are the granular unit of analysis. Weak-topic detection and
recommendations operate at the Topic level, not Subject level.
Example: Subject="Mathematics" → Topics=["Quadratic Equations", "Trigonometry", ...]
"""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class Subject(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "subjects"

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)  # "Mathematics"
    code: Mapped[str | None] = mapped_column(String(20))            # "MATH101"
    grade: Mapped[str] = mapped_column(String(20), nullable=False)  # "10"
    description: Mapped[str | None] = mapped_column(Text)
    credit_hours: Mapped[int | None] = mapped_column(Integer)

    # Relationships
    institution: Mapped["Institution"] = relationship(back_populates="subjects")
    topics: Mapped[list["Topic"]] = relationship(back_populates="subject", cascade="all, delete-orphan")
    teacher_assignments: Mapped[list["TeacherSubject"]] = relationship(back_populates="subject")
    assessments: Mapped[list["Assessment"]] = relationship(back_populates="subject")

    def __repr__(self) -> str:
        return f"<Subject {self.name!r} [{self.grade}]>"


class Topic(UUIDMixin, TimestampMixin, Base):
    """
    A topic/chapter within a subject.
    The AI uses topics to:
      1. Tag OCR questions to topics
      2. Tag student answers to topics
      3. Compute per-topic accuracy to detect weak topics
      4. Generate topic-specific recommendations
    """
    __tablename__ = "topics"

    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, default=0)  # Curriculum sequence
    
    # Embedding vector stored as JSONB for similarity search
    # In production, use pgvector extension for true vector search
    embedding_json: Mapped[dict | None] = mapped_column()

    subject: Mapped["Subject"] = relationship(back_populates="topics")
    weak_topic_records: Mapped[list["WeakTopic"]] = relationship(back_populates="topic")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="topic")

    def __repr__(self) -> str:
        return f"<Topic {self.name!r}>"
