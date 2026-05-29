"""
app/celery_app.py — Celery Worker Configuration

Why Celery?
  AI tasks (OCR, STT, report generation) are too slow for HTTP responses.
  OCR on a multi-page PDF may take 10–60 seconds.
  Whisper on a 60-min lecture may take 5–20 minutes.
  Intelligence profile builds take 30–90 seconds each.
  
  Celery offloads these to a background worker pool. The API immediately
  returns a job_id. The client polls /status/{job_id} or uses WebSocket
  notifications when done.

Queue strategy:
  ai_heavy   → OCR, STT, Intelligence profile, LLM reports (concurrency=2)
  analytics  → Risk scoring, aggregation, model retraining (concurrency=4)
  default    → Misc tasks
"""

from celery import Celery
from kombu import Queue

from app.config import settings

# ─── App Instance ─────────────────────────────────────────────────────────────
celery_app = Celery(
    "studentai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.ocr_tasks",
        "app.tasks.stt_tasks",
        "app.tasks.report_tasks",
        "app.tasks.intelligence_tasks",   # Phase 2: full profile builds
    ],
)

# ─── Configuration ────────────────────────────────────────────────────────────
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    result_expires=86400,   # Keep results 24h then auto-delete

    # ── Task Queues (priority-separated) ─────────────────────────────────────
    task_queues=[
        Queue("default",   routing_key="default"),
        Queue("ai_heavy",  routing_key="ai_heavy"),   # OCR, STT, LLM, Profile builds
        Queue("analytics", routing_key="analytics"),  # ML scoring, aggregation
    ],
    task_default_queue="default",
    task_routes={
        "app.tasks.ocr_tasks.*":          {"queue": "ai_heavy"},
        "app.tasks.stt_tasks.*":          {"queue": "ai_heavy"},
        "app.tasks.report_tasks.*":       {"queue": "ai_heavy"},
        "app.tasks.intelligence_tasks.build_intelligence_profile": {"queue": "ai_heavy"},
        "app.tasks.intelligence_tasks.rebuild_all_profiles":       {"queue": "analytics"},
        "app.tasks.intelligence_tasks.retrain_risk_model":         {"queue": "analytics"},
    },

    # ── Worker settings ────────────────────────────────────────────────────────
    task_acks_late=True,            # Acknowledge only after completion
    worker_prefetch_multiplier=1,   # No prefetch — tasks are long-running
    task_ignore_result=False,

    # ── Celery Beat: Scheduled Tasks ──────────────────────────────────────────
    beat_schedule={
        # Every Sunday 2 AM UTC: rebuild ALL student intelligence profiles
        "weekly-profile-rebuild": {
            "task": "app.tasks.intelligence_tasks.rebuild_all_profiles",
            "schedule": {
                "minute": "0",
                "hour": "2",
                "day_of_week": "0",  # Sunday
            },
        },
        # Every Monday 3 AM UTC: retrain XGBoost risk model with latest data
        "weekly-ml-retrain": {
            "task": "app.tasks.intelligence_tasks.retrain_risk_model",
            "schedule": {
                "minute": "0",
                "hour": "3",
                "day_of_week": "1",  # Monday
            },
        },
    },
)


# ─── Configuration ────────────────────────────────────────────────────────────
celery_app.conf.update(
    # Serialization: JSON is safe and language-agnostic
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Result TTL: keep results for 24 hours then auto-delete
    result_expires=86400,
    # Task routing: separate queues for different priorities
    # This lets us scale OCR workers independently of report workers
    task_queues=[
        Queue("default", routing_key="default"),
        Queue("ai_heavy", routing_key="ai_heavy"),    # OCR, STT, LLM
        Queue("analytics", routing_key="analytics"),  # Aggregation tasks
    ],
    task_default_queue="default",
    task_routes={
        "app.tasks.ocr_tasks.*": {"queue": "ai_heavy"},
        "app.tasks.stt_tasks.*": {"queue": "ai_heavy"},
        "app.tasks.report_tasks.*": {"queue": "ai_heavy"},
        "app.tasks.analytics_tasks.*": {"queue": "analytics"},
    },
    # Retry configuration for transient failures (e.g., Ollama restarting)
    task_acks_late=True,          # Acknowledge only after task completes
    worker_prefetch_multiplier=1, # Don't prefetch — AI tasks are long-running
    # Prevent duplicate processing: if same file_hash submitted twice,
    # deduplication happens at the task level (checked in tasks themselves)
    task_ignore_result=False,
    # Beat scheduler (for periodic analytics recomputation)
    beat_schedule={
        "weekly-analytics-recompute": {
            "task": "app.tasks.analytics_tasks.recompute_institution_analytics",
            "schedule": 604800.0,  # Every 7 days
        },
    },
)
