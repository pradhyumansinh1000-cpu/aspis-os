"""
app/api/v1/ocr.py — Question Paper OCR Upload & Status Endpoints
"""

import hashlib
import os
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, require_teacher
from app.core.exceptions import ConflictError, FileProcessingError, NotFoundError
from app.database import get_db
from app.models.ocr_document import OCRDocument, OCRStatus
from app.schemas.base import MessageResponse, SuccessResponse
from app.tasks.ocr_tasks import process_ocr_document

router = APIRouter(prefix="/ocr", tags=["OCR - Question Papers"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
}
MAX_FILE_SIZE_MB = 50


@router.post(
    "/upload",
    response_model=SuccessResponse[dict],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a question paper for OCR processing",
    dependencies=[Depends(require_teacher)],
)
async def upload_question_paper(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    file: UploadFile = File(..., description="PDF or image of question paper (max 50MB)"),
):
    """
    Upload a question paper (PDF or image).
    Returns immediately with a job_id. Processing happens in background.
    Poll GET /ocr/{job_id}/status to check progress.
    
    Processing pipeline (async):
      1. OCR extraction (PaddleOCR/Tesseract)
      2. Llama 70B question parsing
      3. Nemotron Embed topic classification
    """
    # ── Validate file type ────────────────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise FileProcessingError(
            f"File type '{content_type}' not supported. "
            f"Allowed: PDF, JPEG, PNG, TIFF, WebP"
        )

    # ── Read and validate file size ───────────────────────────────────────────
    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise FileProcessingError(
            f"File too large ({file_size_mb:.1f}MB). Maximum is {MAX_FILE_SIZE_MB}MB."
        )

    # ── Deduplication: check content hash ────────────────────────────────────
    content_hash = hashlib.sha256(file_bytes).hexdigest()
    existing = await db.execute(
        select(OCRDocument).where(
            OCRDocument.content_hash == content_hash,
            OCRDocument.status == OCRStatus.COMPLETED,
        )
    )
    existing_doc = existing.scalar_one_or_none()
    if existing_doc:
        # Return cached result — no need to reprocess same paper
        return SuccessResponse(data={
            "job_id": str(existing_doc.id),
            "status": "completed",
            "message": "This document was previously processed. Returning cached result.",
            "cached": True,
        })

    # ── Save file to disk/S3 ──────────────────────────────────────────────────
    upload_dir = Path(settings.LOCAL_UPLOAD_DIR) / "ocr" / str(current_user.institution_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = uuid.uuid4()
    ext = Path(file.filename or "file").suffix or ".pdf"
    file_path = upload_dir / f"{file_id}{ext}"

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # ── Create OCRDocument record ─────────────────────────────────────────────
    doc = OCRDocument(
        institution_id=current_user.institution_id,
        uploaded_by=current_user.id,
        original_filename=file.filename or "unknown",
        file_path=str(file_path),
        file_size_bytes=len(file_bytes),
        mime_type=content_type,
        content_hash=content_hash,
        status=OCRStatus.QUEUED,
    )
    db.add(doc)
    await db.flush()

    # ── Enqueue Celery task ───────────────────────────────────────────────────
    task = process_ocr_document.delay(str(doc.id))
    doc.task_id = task.id
    await db.flush()

    return SuccessResponse(data={
        "job_id": str(doc.id),
        "task_id": task.id,
        "status": "queued",
        "message": f"File '{file.filename}' uploaded. OCR processing started.",
        "estimated_time": "30–120 seconds depending on page count",
        "polling_url": f"/api/v1/ocr/{doc.id}/status",
    })


@router.get(
    "/{job_id}/status",
    response_model=SuccessResponse[dict],
    summary="Check OCR processing status",
)
async def get_ocr_status(
    job_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """Poll this endpoint to check if OCR processing is complete."""
    result = await db.execute(
        select(OCRDocument).where(OCRDocument.id == job_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundError("OCR Job", str(job_id))

    return SuccessResponse(data={
        "job_id": str(doc.id),
        "status": doc.status.value,
        "original_filename": doc.original_filename,
        "page_count": doc.page_count,
        "confidence_score": doc.confidence_score,
        "processing_time_ms": doc.processing_time_ms,
        "error_message": doc.error_message,
        "questions_extracted": (
            len(doc.extracted_questions.get("questions", []))
            if doc.extracted_questions else 0
        ),
    })


@router.get(
    "/{job_id}/result",
    response_model=SuccessResponse[dict],
    summary="Get extracted questions from OCR result",
    dependencies=[Depends(require_teacher)],
)
async def get_ocr_result(
    job_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Get the full structured result: extracted questions with topic classifications.
    Only available when status is 'completed'.
    """
    result = await db.execute(
        select(OCRDocument).where(OCRDocument.id == job_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundError("OCR Job", str(job_id))

    if doc.status != OCRStatus.COMPLETED:
        from app.core.exceptions import ValidationError_
        raise ValidationError_(
            f"OCR processing is not complete yet. Current status: {doc.status.value}"
        )

    return SuccessResponse(data={
        "job_id": str(doc.id),
        "original_filename": doc.original_filename,
        "confidence_score": doc.confidence_score,
        "extracted_questions": doc.extracted_questions,
    })
