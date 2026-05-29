"""
app/tasks/ocr_tasks.py — Celery Tasks for OCR Processing

Task flow:
  1. API receives uploaded file → stores to disk/S3 → creates OCRDocument record
  2. API enqueues this Celery task with the document ID
  3. This task runs in a worker:
     a. Load file bytes
     b. Run OCR pipeline → raw text
     c. Call Llama 70B to parse questions from raw text
     d. Call Nemotron Embed to classify each question to a topic
     e. Update OCRDocument record with results
  4. Frontend polls /api/v1/ocr/{job_id}/status until COMPLETED

Why Celery and not asyncio?
  PaddleOCR and Whisper are CPU-bound and not async.
  Celery workers are separate processes — they don't block the FastAPI server.
"""

import asyncio
import time
import uuid

import structlog
from celery import Task

from app.ai.llm_client import get_llama_client
from app.ai.ocr_pipeline import get_ocr_pipeline
from app.celery_app import celery_app
from app.database import get_db_context
from app.models.ocr_document import OCRDocument, OCRStatus

logger = structlog.get_logger()

PARSE_QUESTIONS_SYSTEM_PROMPT = """You are an expert exam paper parser.
Extract all questions from the provided OCR text into a structured JSON format.
Handle:
- Numbered questions (Q1, 1., (1), etc.)
- Sub-questions (a, b, c or i, ii, iii)
- Mark allocations ([5 marks], (3), etc.)
- Multiple choice options if present
Respond ONLY with valid JSON."""


def run_async(coro):
    """Run an async coroutine from a synchronous Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    bind=True,
    name="app.tasks.ocr_tasks.process_ocr_document",
    max_retries=3,
    default_retry_delay=30,
    queue="ai_heavy",
)
def process_ocr_document(self: Task, document_id: str) -> dict:
    """
    Main OCR processing task.
    
    bind=True: gives access to self.retry() for automatic retries
    max_retries=3: retry up to 3 times on transient failures
    default_retry_delay=30: wait 30s between retries
    """
    doc_uuid = uuid.UUID(document_id)
    logger.info("OCR task started", document_id=document_id)

    async def _process():
        async with get_db_context() as db:
            # Load document record
            from sqlalchemy import select
            result = await db.execute(
                select(OCRDocument).where(OCRDocument.id == doc_uuid)
            )
            doc = result.scalar_one_or_none()
            if not doc:
                logger.error("OCRDocument not found", document_id=document_id)
                return {"status": "error", "message": "Document not found"}

            # Update status to PROCESSING
            doc.status = OCRStatus.PROCESSING
            await db.flush()

            try:
                # ── Step 1: Read file ─────────────────────────────────────────
                with open(doc.file_path, "rb") as f:
                    file_bytes = f.read()

                # ── Step 2: OCR ───────────────────────────────────────────────
                ocr = get_ocr_pipeline()
                ocr_result = ocr.process_file(file_bytes, doc.mime_type or "application/pdf")

                doc.raw_text = ocr_result["raw_text"]
                doc.confidence_score = ocr_result["confidence"]
                doc.page_count = ocr_result["page_count"]
                doc.processing_time_ms = ocr_result["processing_time_ms"]
                await db.flush()

                # ── Step 3: Parse questions with Llama 70B ────────────────────
                llm = get_llama_client()
                parse_prompt = f"""Extract all questions from this exam paper OCR text.

OCR TEXT:
{ocr_result['raw_text'][:8000]}  

Return JSON:
{{
  "subject_hint": "detected subject name if visible",
  "total_marks_hint": detected total marks or null,
  "questions": [
    {{
      "number": 1,
      "text": "Full question text",
      "marks": 5,
      "difficulty_hint": "easy|medium|hard",
      "topic_hint": "apparent topic/chapter",
      "sub_questions": []
    }}
  ]
}}"""

                llm_result = await llm.generate_json(
                    prompt=parse_prompt,
                    system_prompt=PARSE_QUESTIONS_SYSTEM_PROMPT,
                    temperature=0.1,
                )
                doc.extracted_questions = llm_result["parsed"]

                # ── Step 4: Topic classification via Nemotron Embed ───────────
                questions = doc.extracted_questions.get("questions", [])
                if questions:
                    from app.ai.embeddings import get_embed_client
                    embedder = get_embed_client()
                    # Get topics for the institution (simplified — full impl uses subject filter)
                    from app.models.subject import Topic as TopicModel
                    topics_result = await db.execute(
                        select(TopicModel).where(
                            TopicModel.subject_id.in_(
                                select(TopicModel.subject_id).limit(100)
                            )
                        ).limit(100)
                    )
                    topics = topics_result.scalars().all()
                    topic_dicts = [
                        {"id": t.id, "name": t.name, "description": t.description or ""}
                        for t in topics
                    ]

                    for q in questions:
                        if q.get("text") and topic_dicts:
                            best_topic_id, similarity = await embedder.find_best_matching_topic(
                                question_text=q["text"],
                                topics=topic_dicts,
                            )
                            q["matched_topic_id"] = best_topic_id
                            q["topic_similarity"] = round(similarity, 4)

                    doc.extracted_questions["questions"] = questions

                # ── Step 5: Mark complete ─────────────────────────────────────
                doc.status = OCRStatus.COMPLETED
                await db.flush()

                logger.info(
                    "OCR task completed",
                    document_id=document_id,
                    questions_extracted=len(questions),
                    confidence=round(ocr_result["confidence"], 3),
                )
                return {
                    "status": "completed",
                    "document_id": document_id,
                    "questions_count": len(questions),
                }

            except Exception as exc:
                doc.status = OCRStatus.FAILED
                doc.error_message = str(exc)[:1000]
                await db.flush()
                logger.error("OCR task failed", document_id=document_id, error=str(exc))
                raise

    try:
        return run_async(_process())
    except Exception as exc:
        # Retry on transient errors (network, service unavailable)
        raise self.retry(exc=exc)
