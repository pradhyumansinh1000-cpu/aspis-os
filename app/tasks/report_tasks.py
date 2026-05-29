"""
app/tasks/report_tasks.py — Celery Tasks for AI Report Generation
"""

import asyncio
import time
import uuid

import structlog
from celery import Task

from app.ai.report_generator import get_report_generator
from app.ai.weak_topic_detector import get_weak_topic_detector
from app.celery_app import celery_app
from app.database import get_db_context
from app.models.ai_report import AIReport, ReportStatus, ReportType

logger = structlog.get_logger()


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    bind=True,
    name="app.tasks.report_tasks.generate_student_report",
    max_retries=2,
    default_retry_delay=60,
    queue="ai_heavy",
)
def generate_student_report(self: Task, report_id: str) -> dict:
    """
    Generate an AI report for a student.
    Called after new scores are entered or on-demand.
    """
    report_uuid = uuid.UUID(report_id)

    async def _generate():
        async with get_db_context() as db:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            # Load report with student profile
            result = await db.execute(
                select(AIReport)
                .where(AIReport.id == report_uuid)
                .options(
                    selectinload(AIReport.student).selectinload(
                        __import__("app.models.student", fromlist=["Student"]).Student.user
                    )
                )
            )
            report = result.scalar_one_or_none()
            if not report:
                return {"status": "error", "message": "Report not found"}

            report.status = ReportStatus.PROCESSING
            await db.flush()

            start = time.perf_counter()

            try:
                student = report.student
                user = student.user

                # Gather student data for report
                from app.services.analytics_service import AnalyticsService
                from app.redis_client import RedisCache, get_redis

                # Use a minimal cache for task context
                redis = await get_redis()
                cache = RedisCache(redis, "analytics")

                analytics_svc = AnalyticsService(db, cache)
                analytics = await analytics_svc.get_student_analytics(student.id)

                student_data = {
                    "name": user.full_name,
                    "grade": student.grade,
                    "subject_performances": [
                        sp.model_dump() for sp in analytics.subject_performances
                    ],
                    "weak_topics": [wt.model_dump() for wt in analytics.weak_topics],
                    "attendance_pct": analytics.attendance.attendance_percentage,
                    "overall_score": analytics.overall_score,
                    "score_trend": [st.model_dump() for st in analytics.score_trend],
                    "recommendations_count": 0,
                }

                gen = get_report_generator()

                if report.report_type == ReportType.PARENT_SUMMARY:
                    content = await gen.generate_parent_summary(student_data)
                else:
                    content = await gen.generate_student_report(student_data)

                duration_ms = int((time.perf_counter() - start) * 1000)

                report.content = content
                report.status = ReportStatus.COMPLETED
                report.generation_time_ms = duration_ms
                report.model_version = "llama3:70b"
                await db.flush()

                logger.info(
                    "Report generated",
                    report_id=report_id,
                    report_type=report.report_type.value,
                    duration_ms=duration_ms,
                )
                return {"status": "completed", "report_id": report_id}

            except Exception as exc:
                report.status = ReportStatus.FAILED
                report.error_message = str(exc)[:1000]
                await db.flush()
                logger.error("Report generation failed", report_id=report_id, error=str(exc))
                raise

    try:
        return run_async(_generate())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.tasks.report_tasks.run_weak_topic_detection",
    queue="analytics",
)
def run_weak_topic_detection(student_id: str, subject_id: str) -> dict:
    """
    Triggered after new scores are entered.
    Detects weak topics and updates WeakTopic records.
    """
    async def _detect():
        from sqlalchemy import select
        from app.models.assessment import AssessmentQuestion, StudentScore
        from app.models.subject import Topic, Subject
        from app.models.weak_topic import WeakTopic
        from app.models.student import Student

        student_uuid = uuid.UUID(student_id)
        subject_uuid = uuid.UUID(subject_id)

        async with get_db_context() as db:
            # Load student name
            student_result = await db.execute(
                select(Student).where(Student.id == student_uuid)
                .options(
                    __import__("sqlalchemy.orm", fromlist=["selectinload"]).selectinload(
                        Student.user
                    )
                )
            )
            student = student_result.scalar_one_or_none()
            if not student:
                return {"status": "error"}

            # Load subject name
            subject_result = await db.execute(
                select(Subject).where(Subject.id == subject_uuid)
            )
            subject = subject_result.scalar_one_or_none()

            # Fetch all scores for this student+subject with topic info
            scores_result = await db.execute(
                select(
                    StudentScore.marks_obtained,
                    AssessmentQuestion.max_marks,
                    Topic.id.label("topic_id"),
                    Topic.name.label("topic_name"),
                )
                .join(AssessmentQuestion, StudentScore.question_id == AssessmentQuestion.id)
                .join(Topic, AssessmentQuestion.topic_id == Topic.id)
                .where(
                    StudentScore.student_id == student_uuid,
                    Topic.subject_id == subject_uuid,
                    StudentScore.is_absent == False,
                )
            )
            score_rows = scores_result.all()
            scores = [row._asdict() for row in score_rows]

            if not scores:
                return {"status": "no_data"}

            detector = get_weak_topic_detector()
            weak_topics = await detector.detect_and_explain(
                student_name=student.user.full_name,
                subject_name=subject.name if subject else "Unknown",
                scores=scores,
            )

            # Upsert WeakTopic records
            for wt_data in weak_topics:
                existing = await db.execute(
                    select(WeakTopic).where(
                        WeakTopic.student_id == student_uuid,
                        WeakTopic.topic_id == uuid.UUID(wt_data["topic_id"]),
                    )
                )
                existing_wt = existing.scalar_one_or_none()

                if existing_wt:
                    existing_wt.accuracy_score = wt_data["accuracy_score"]
                    existing_wt.severity_score = wt_data["severity_score"]
                    existing_wt.ai_reasoning = wt_data.get("ai_reasoning")
                    existing_wt.data_points = wt_data["data_points"]
                    existing_wt.is_resolved = False
                else:
                    new_wt = WeakTopic(
                        student_id=student_uuid,
                        topic_id=uuid.UUID(wt_data["topic_id"]),
                        subject_id=subject_uuid,
                        accuracy_score=wt_data["accuracy_score"],
                        severity_score=wt_data["severity_score"],
                        ai_reasoning=wt_data.get("ai_reasoning"),
                        data_points=wt_data["data_points"],
                    )
                    db.add(new_wt)

            await db.flush()

            logger.info(
                "Weak topic detection complete",
                student_id=student_id,
                weak_count=len(weak_topics),
            )
            return {"status": "completed", "weak_topics_found": len(weak_topics)}

    return run_async(_detect())
