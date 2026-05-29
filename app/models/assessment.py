"""
app/models/assessment.py — Assessments, Questions & Student Scores

Schema design philosophy:
- Assessment: Metadata (exam name, date, total marks)
- AssessmentQuestion: Each question with topic tag + max marks
- StudentScore: Per-question score with JSONB answer_data for rich AI analysis

Storing per-question scores (not just totals) enables:
  - Topic-level accuracy calculation
  - Weak area detection with evidence
  - Trend analysis over multiple assessments
"""

import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class AssessmentType(str, enum.Enum):
    UNIT_TEST = "unit_test"
    MIDTERM = "midterm"
    FINAL = "final"
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"
    MOCK = "mock"


class DifficultyLevel(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Assessment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "assessments"

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False, index=True
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=True, index=True
    )
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    assessment_type: Mapped[AssessmentType] = mapped_column(
        Enum(AssessmentType), nullable=False
    )
    grade: Mapped[str] = mapped_column(String(20), nullable=False)
    section: Mapped[str | None] = mapped_column(String(10))
    total_marks: Mapped[float] = mapped_column(Float, nullable=False)
    passing_marks: Mapped[float] = mapped_column(Float, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    held_on: Mapped[str | None] = mapped_column(String(20))  # "2024-11-15"
    
    # If this assessment was created from OCR upload, link it
    ocr_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ocr_documents.id"), nullable=True
    )

    subject: Mapped["Subject"] = relationship(back_populates="assessments")
    teacher: Mapped["Teacher | None"] = relationship(back_populates="assessments")
    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan"
    )
    student_scores: Mapped[list["StudentScore"]] = relationship(back_populates="assessment")

    def __repr__(self) -> str:
        return f"<Assessment {self.name!r} [{self.assessment_type.value}]>"


class AssessmentQuestion(UUIDMixin, Base):
    """
    Individual question within an assessment.
    topic_id links each question to a curriculum topic for analysis.
    """
    __tablename__ = "assessment_questions"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topics.id"), nullable=True, index=True
    )

    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str | None] = mapped_column(Text)  # May be null if OCR parsed image
    max_marks: Mapped[float] = mapped_column(Float, nullable=False)
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        Enum(DifficultyLevel), default=DifficultyLevel.MEDIUM
    )
    # OCR-extracted metadata stored as flexible JSONB
    ocr_metadata: Mapped[dict | None] = mapped_column(JSONB)

    assessment: Mapped["Assessment"] = relationship(back_populates="questions")
    topic: Mapped["Topic | None"] = relationship()


class StudentScore(UUIDMixin, TimestampMixin, Base):
    """
    Per-question score for a student.
    
    answer_data JSONB stores:
      {
        "marks_obtained": 7.5,
        "is_correct": true,
        "attempted": true,
        "ai_feedback": "Good use of formula but missed sign convention",
        "topic_tags": ["kinematics", "velocity"]
      }
    """
    __tablename__ = "student_scores"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False, index=True
    )
    question_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment_questions.id"), nullable=True
    )

    # If question_id is null, this is a total score record
    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False)
    is_absent: Mapped[bool] = mapped_column(default=False)
    answer_data: Mapped[dict | None] = mapped_column(JSONB)

    student: Mapped["Student"] = relationship(back_populates="scores")
    assessment: Mapped["Assessment"] = relationship(back_populates="student_scores")
    question: Mapped["AssessmentQuestion | None"] = relationship()
