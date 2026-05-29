"""
app/models/ocr_document.py — OCR Question Paper Processing
"""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class OCRStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class OCRDocument(UUIDMixin, TimestampMixin, Base):
    """
    Represents an uploaded question paper (PDF or image).
    
    Processing pipeline:
      1. Teacher uploads PDF/image
      2. Celery task: pdf2image → PaddleOCR / Tesseract → raw text
      3. Llama 70B: parse raw text → structured questions JSON
      4. Nemotron Embed: embed each question → topic classification
      5. AssessmentQuestion records created from extracted questions
    """
    __tablename__ = "ocr_documents"

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    
    # File metadata
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)  # S3 key or local path
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    page_count: Mapped[int | None] = mapped_column(Integer)
    
    # Content hash for deduplication (sha256 of file content)
    # If same file is uploaded twice, reuse the result
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    
    # OCR Output
    status: Mapped[OCRStatus] = mapped_column(Enum(OCRStatus), default=OCRStatus.UPLOADED)
    raw_text: Mapped[str | None] = mapped_column(Text)           # Raw OCR output
    confidence_score: Mapped[float | None] = mapped_column()     # Average OCR confidence
    
    # Structured output from LLM parsing
    # {"questions": [{"number": 1, "text": "...", "marks": 5, "topic_hint": "..."}]}
    extracted_questions: Mapped[dict | None] = mapped_column(JSONB)
    
    # Processing metadata
    task_id: Mapped[str | None] = mapped_column(String(255))
    error_message: Mapped[str | None] = mapped_column(Text)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer)

    def __repr__(self) -> str:
        return f"<OCRDocument {self.original_filename!r} [{self.status.value}]>"
