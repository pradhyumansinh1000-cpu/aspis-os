"""
app/api/v1/speech.py — Classroom Speech-to-Text Endpoints
"""

import hashlib
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, require_teacher
from app.core.exceptions import FileProcessingError, NotFoundError
from app.database import get_db
from app.models.speech_session import SpeechSession, SpeechStatus
from app.schemas.base import SuccessResponse
from app.tasks.stt_tasks import process_speech_session

router = APIRouter(prefix="/speech", tags=["Speech - Classroom Analysis"])

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/wav", "audio/x-wav",
    "audio/mp4", "audio/x-m4a", "audio/ogg",
    "video/mp4", "video/webm",
}
MAX_AUDIO_SIZE_MB = 500  # Up to 500MB for long lectures


@router.post(
    "/upload",
    response_model=SuccessResponse[dict],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload classroom audio for transcription and analysis",
    dependencies=[Depends(require_teacher)],
)
async def upload_audio(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    file: UploadFile = File(...),
    subject_id: uuid.UUID | None = None,
    grade: str = "10",
    session_date: str = "",
):
    """
    Upload classroom audio/video for Whisper transcription + LLM analysis.
    Returns job_id immediately. Processing is async (5–30 min for long lectures).
    """
    content_type = file.content_type or ""
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise FileProcessingError(
            f"Audio type '{content_type}' not supported. "
            "Allowed: MP3, WAV, MP4, M4A, OGG, WebM"
        )

    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > MAX_AUDIO_SIZE_MB:
        raise FileProcessingError(f"File too large ({file_size_mb:.0f}MB). Max: {MAX_AUDIO_SIZE_MB}MB")

    # Content hash deduplication
    content_hash = hashlib.sha256(file_bytes).hexdigest()
    existing = await db.execute(
        select(SpeechSession).where(
            SpeechSession.content_hash == content_hash,
            SpeechSession.status == SpeechStatus.COMPLETED,
        )
    )
    if existing_session := existing.scalar_one_or_none():
        return SuccessResponse(data={
            "session_id": str(existing_session.id),
            "status": "completed",
            "cached": True,
            "message": "This audio was previously processed.",
        })

    # Save file
    upload_dir = Path(settings.LOCAL_UPLOAD_DIR) / "speech" / str(current_user.institution_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4()
    ext = Path(file.filename or "audio").suffix or ".mp3"
    file_path = upload_dir / f"{file_id}{ext}"
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Create session record
    from app.models.teacher import Teacher
    teacher_result = await db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = teacher_result.scalar_one_or_none()

    speech_session = SpeechSession(
        institution_id=current_user.institution_id,
        teacher_id=teacher.id if teacher else current_user.id,
        subject_id=subject_id,
        session_date=session_date or str(uuid.uuid4())[:10],
        grade=grade,
        file_path=str(file_path),
        content_hash=content_hash,
        status=SpeechStatus.UPLOADED,
    )
    db.add(speech_session)
    await db.flush()

    task = process_speech_session.delay(str(speech_session.id))
    speech_session.task_id = task.id
    await db.flush()

    return SuccessResponse(data={
        "session_id": str(speech_session.id),
        "task_id": task.id,
        "status": "queued",
        "file_size_mb": round(file_size_mb, 1),
        "estimated_time": f"{int(file_size_mb * 0.5)}–{int(file_size_mb * 2)} minutes",
        "polling_url": f"/api/v1/speech/{speech_session.id}/status",
    })


@router.get(
    "/{session_id}/status",
    response_model=SuccessResponse[dict],
    summary="Check speech processing status",
)
async def get_speech_status(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    result = await db.execute(
        select(SpeechSession).where(SpeechSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Speech Session", str(session_id))

    return SuccessResponse(data={
        "session_id": str(session.id),
        "status": session.status.value,
        "duration_seconds": session.duration_seconds,
        "error_message": session.error_message,
    })


@router.get(
    "/{session_id}/transcript",
    response_model=SuccessResponse[dict],
    summary="Get full transcript of classroom audio",
)
async def get_transcript(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    result = await db.execute(
        select(SpeechSession).where(SpeechSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Speech Session", str(session_id))

    return SuccessResponse(data={
        "session_id": str(session.id),
        "transcript": session.transcript,
        "duration_seconds": session.duration_seconds,
        "whisper_model": session.whisper_model_used,
    })


@router.get(
    "/{session_id}/insights",
    response_model=SuccessResponse[dict],
    summary="Get AI insights from classroom session",
)
async def get_insights(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """Returns LLM-generated insights: topics covered, student questions, engagement score."""
    result = await db.execute(
        select(SpeechSession).where(SpeechSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Speech Session", str(session_id))

    return SuccessResponse(data={
        "session_id": str(session.id),
        "insights": session.insights,
        "session_date": session.session_date,
        "duration_seconds": session.duration_seconds,
    })
