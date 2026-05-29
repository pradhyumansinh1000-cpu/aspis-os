"""
app/tasks/stt_tasks.py — Celery Tasks for Speech-to-Text + AI Analysis
"""

import asyncio
import uuid

import structlog
from celery import Task

from app.ai.stt_pipeline import get_stt_pipeline
from app.celery_app import celery_app
from app.database import get_db_context
from app.models.speech_session import SpeechSession, SpeechStatus

logger = structlog.get_logger()

CLASSROOM_ANALYSIS_PROMPT = """You are an educational analyst reviewing a classroom lecture transcript.
Analyze it for teaching quality, topic coverage, and student engagement signals.
Respond ONLY with valid JSON."""


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    bind=True,
    name="app.tasks.stt_tasks.process_speech_session",
    max_retries=2,
    default_retry_delay=60,
    queue="ai_heavy",
)
def process_speech_session(self: Task, session_id: str) -> dict:
    """
    Speech-to-text + LLM classroom analysis task.
    
    For a 1-hour lecture:
      - Whisper (base): ~5–10 minutes on CPU
      - Whisper (large): ~3–5 minutes on GPU
      - LLM analysis: ~30s
    """
    session_uuid = uuid.UUID(session_id)

    async def _process():
        async with get_db_context() as db:
            from sqlalchemy import select
            result = await db.execute(
                select(SpeechSession).where(SpeechSession.id == session_uuid)
            )
            session = result.scalar_one_or_none()
            if not session:
                return {"status": "error", "message": "Session not found"}

            session.status = SpeechStatus.TRANSCRIBING
            await db.flush()

            try:
                # ── Step 1: Load audio ────────────────────────────────────────
                with open(session.file_path, "rb") as f:
                    audio_bytes = f.read()

                # ── Step 2: Whisper transcription ─────────────────────────────
                stt = get_stt_pipeline()
                stt_result = stt.transcribe(
                    audio_bytes=audio_bytes,
                    mime_type="audio/mpeg",  # In production, detect from file
                )

                session.transcript = stt_result["transcript"]
                session.whisper_model_used = stt_result.get("whisper_model", "base")
                session.duration_seconds = int(stt_result.get("duration_seconds", 0))
                session.status = SpeechStatus.ANALYZING
                await db.flush()

                # ── Step 3: LLM classroom analysis ───────────────────────────
                from app.ai.llm_client import get_llama_client
                llm = get_llama_client()

                # Truncate transcript for LLM context window (max ~6000 words)
                transcript_snippet = " ".join(stt_result["transcript"].split()[:6000])

                analysis_prompt = f"""Analyze this classroom lecture transcript:

TRANSCRIPT:
{transcript_snippet}

Provide a comprehensive analysis as JSON:
{{
  "topics_covered": ["topic1", "topic2"],
  "duration_estimate_minutes": <int>,
  "student_questions_detected": ["question 1", "question 2"],
  "difficult_concepts_mentioned": ["concept 1", "concept 2"],
  "engagement_indicators": {{
    "interaction_count": <int>,
    "engagement_score": <float 1-10>,
    "notes": "..."
  }},
  "teaching_pace": "slow|appropriate|fast",
  "summary": "2-3 sentence lecture summary",
  "suggested_followup_topics": ["topic for next class"],
  "attendance_roll_call_detected": true/false,
  "students_named": ["student name if mentioned in roll call"]
}}"""

                insight_result = await llm.generate_json(
                    prompt=analysis_prompt,
                    system_prompt=CLASSROOM_ANALYSIS_PROMPT,
                    temperature=0.2,
                )
                session.insights = insight_result["parsed"]
                session.status = SpeechStatus.COMPLETED
                await db.flush()

                logger.info(
                    "Speech session processed",
                    session_id=session_id,
                    duration_s=session.duration_seconds,
                    topics=len(session.insights.get("topics_covered", [])),
                )
                return {"status": "completed", "session_id": session_id}

            except Exception as exc:
                session.status = SpeechStatus.FAILED
                session.error_message = str(exc)[:1000]
                await db.flush()
                logger.error("Speech task failed", session_id=session_id, error=str(exc))
                raise

    try:
        return run_async(_process())
    except Exception as exc:
        raise self.retry(exc=exc)
