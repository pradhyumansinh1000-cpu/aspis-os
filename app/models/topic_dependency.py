"""
app/models/topic_dependency.py — The Knowledge Dependency Graph (Backbone)

This is THE most important model in the entire system.
Without this, future risk prediction is just guesswork.

A TopicDependency says:
  "To understand [target_topic], a student MUST understand [source_topic]"
  
Example:
  source=Fractions, target=Algebra → strength=0.9, grade_gap=2
  "Weak fractions in Grade 6 will severely impact Algebra in Grade 8"

dependency_strength: 0.0 (loose) → 1.0 (strict prerequisite)
  - Fractions → Algebra: 0.95 (very strong)
  - Sports → Discipline: 0.40 (moderate correlation, not hard dependency)
  - Reading Comp → History: 0.75 (strong)
  
grade_gap: Number of grade levels until the target topic is taught.
  Used for future impact timeline: grade_gap=0 means same grade impact.
  
is_cross_subject: Whether the dependency spans different subjects.
  (Math Algebra → Physics Numericals is cross-subject)

curriculum_board: Dependency may vary by CBSE/ICSE/IB/State board.
"""

import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class TopicDependency(UUIDMixin, TimestampMixin, Base):
    """
    Directed edge in the Knowledge Dependency Graph.
    source_topic → target_topic
    
    "Understanding source is required/helpful for understanding target."
    """
    __tablename__ = "topic_dependencies"

    # The prerequisite topic (what must be known first)
    source_topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The topic that depends on the source
    target_topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Dependency Properties ─────────────────────────────────────────────────
    dependency_strength: Mapped[float] = mapped_column(Float, nullable=False)
    # 0.0–1.0: How critical is source mastery for target success?
    # 0.9+ = hard prerequisite (must master before moving on)
    # 0.5–0.9 = strong correlation (weakness will hinder)
    # 0.2–0.5 = moderate (helpful but not blocking)

    grade_gap: Mapped[int] = mapped_column(Integer, default=0)
    # 0 = same grade, 1 = next grade, 2 = two grades later
    # Used for: "This weakness will manifest in X grade(s)"

    is_cross_subject: Mapped[bool] = mapped_column(Boolean, default=False)
    # True when source and target are in different subjects
    # Example: Math Fractions → Physics Kinematics numericals

    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    # False = AI-inferred dependency (needs teacher review)
    # True = manually confirmed by curriculum expert

    curriculum_board: Mapped[str] = mapped_column(String(50), default="CBSE")
    # CBSE / ICSE / IB / State / Universal

    explanation: Mapped[str | None] = mapped_column(Text)
    # Human-readable explanation of WHY this dependency exists

    source_topic: Mapped["Topic"] = relationship(foreign_keys=[source_topic_id])
    target_topic: Mapped["Topic"] = relationship(foreign_keys=[target_topic_id])

    def __repr__(self) -> str:
        return f"<TopicDependency strength={self.dependency_strength} gap={self.grade_gap}>"


class CurriculumOntology(UUIDMixin, TimestampMixin, Base):
    """
    Extended topic metadata for the educational ontology.
    Augments the existing Topic model with curriculum-specific attributes.
    
    Linked 1:1 to Topic via topic_id.
    """
    __tablename__ = "curriculum_ontology"

    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True,
    )
    curriculum_board: Mapped[str] = mapped_column(String(50), default="CBSE")
    grade_level: Mapped[str] = mapped_column(String(20), nullable=False)
    chapter_name: Mapped[str | None] = mapped_column(String(200))
    chapter_number: Mapped[int | None] = mapped_column(Integer)

    # Bloom's taxonomy level of the topic
    bloom_level: Mapped[str | None] = mapped_column(String(50))
    # remember | understand | apply | analyze | evaluate | create

    # Typical difficulty of questions on this topic
    avg_difficulty: Mapped[str | None] = mapped_column(String(20))  # easy|medium|hard

    # Keywords for NLP/embedding matching
    keywords: Mapped[str | None] = mapped_column(Text)
    # e.g., "fractions, numerator, denominator, equivalent fractions"

    # Concept cluster — groups related topics for batch recommendations
    concept_cluster: Mapped[str | None] = mapped_column(String(100))
    # e.g., "rational_numbers", "linear_equations", "kinematics"

    topic: Mapped["Topic"] = relationship()
