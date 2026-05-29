"""
app/services/analytics_service.py — Performance Analytics Business Logic

Computes all analytics from raw score data.
Results are cached in Redis (TTL=1h) to avoid re-running heavy queries.
Cache is invalidated when new scores are inserted.
"""

import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.assessment import AssessmentQuestion, StudentScore
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.student import Student
from app.models.subject import Subject, Topic
from app.models.weak_topic import WeakTopic
from app.redis_client import RedisCache
from app.schemas.analytics import (
    AttendanceSummary,
    ClassAnalyticsResponse,
    PerformanceTrend,
    StudentAnalyticsResponse,
    SubjectPerformance,
    TopicPerformance,
    WeakTopicSummary,
)

logger = structlog.get_logger()
CACHE_TTL = 3600  # 1 hour


class AnalyticsService:

    def __init__(self, db: AsyncSession, cache: RedisCache):
        self.db = db
        self.cache = cache

    # ── Student Analytics ─────────────────────────────────────────────────────
    async def get_student_analytics(
        self,
        student_id: uuid.UUID,
        force_refresh: bool = False,
    ) -> StudentAnalyticsResponse:
        """
        Full analytics for a single student.
        Cached per student_id for 1 hour.
        """
        cache_key = f"student_analytics:{student_id}"

        if not force_refresh:
            cached = await self.cache.get(cache_key)
            if cached:
                logger.debug("Analytics cache hit", student_id=str(student_id))
                return StudentAnalyticsResponse(**cached)

        # Load student with profile
        result = await self.db.execute(
            select(Student)
            .where(Student.id == student_id, Student.deleted_at.is_(None))
            .options(selectinload(Student.user))
        )
        student = result.scalar_one_or_none()
        if not student:
            raise NotFoundError("Student", str(student_id))

        # Gather all analytics in parallel-friendly queries
        subject_performances = await self._get_subject_performances(student_id)
        attendance = await self._get_attendance_summary(student_id)
        weak_topics = await self._get_weak_topics(student_id)
        score_trend = await self._get_score_trend(student_id)

        analytics = StudentAnalyticsResponse(
            student_id=student_id,
            student_name=student.user.full_name,
            grade=student.grade,
            section=student.section,
            academic_year=student.academic_year,
            overall_score=student.overall_grade_point,
            rank_in_class=None,  # Computed separately (expensive)
            attendance=attendance,
            subject_performances=subject_performances,
            weak_topics=weak_topics,
            score_trend=score_trend,
            generated_at=datetime.now(timezone.utc),
        )

        # Cache result
        await self.cache.set(cache_key, analytics.model_dump(), ttl=CACHE_TTL)
        return analytics

    async def _get_subject_performances(
        self, student_id: uuid.UUID
    ) -> list[SubjectPerformance]:
        """
        Aggregate scores per subject.
        Uses a single query with GROUP BY for efficiency.
        """
        # Get all scores with subject info via joins
        scores_result = await self.db.execute(
            select(
                Subject.id.label("subject_id"),
                Subject.name.label("subject_name"),
                func.avg(
                    StudentScore.marks_obtained * 100.0 /
                    func.nullif(AssessmentQuestion.max_marks, 0)
                ).label("avg_score"),
                func.max(
                    StudentScore.marks_obtained * 100.0 /
                    func.nullif(AssessmentQuestion.max_marks, 0)
                ).label("max_score"),
                func.min(
                    StudentScore.marks_obtained * 100.0 /
                    func.nullif(AssessmentQuestion.max_marks, 0)
                ).label("min_score"),
                func.count(func.distinct(StudentScore.assessment_id)).label("assessment_count"),
            )
            .join(AssessmentQuestion, StudentScore.question_id == AssessmentQuestion.id)
            .join(Topic, AssessmentQuestion.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .where(
                StudentScore.student_id == student_id,
                StudentScore.is_absent == False,
            )
            .group_by(Subject.id, Subject.name)
        )
        rows = scores_result.all()

        performances = []
        for row in rows:
            # Get topic breakdown for this subject
            topic_perfs = await self._get_topic_performances(student_id, row.subject_id)
            performances.append(
                SubjectPerformance(
                    subject_id=row.subject_id,
                    subject_name=row.subject_name,
                    average_score=round(row.avg_score or 0, 2),
                    highest_score=round(row.max_score or 0, 2),
                    lowest_score=round(row.min_score or 0, 2),
                    assessment_count=row.assessment_count,
                    topics=topic_perfs,
                )
            )

        return performances

    async def _get_topic_performances(
        self, student_id: uuid.UUID, subject_id: uuid.UUID
    ) -> list[TopicPerformance]:
        result = await self.db.execute(
            select(
                Topic.id.label("topic_id"),
                Topic.name.label("topic_name"),
                Subject.name.label("subject_name"),
                func.sum(StudentScore.marks_obtained).label("total_obtained"),
                func.sum(AssessmentQuestion.max_marks).label("total_max"),
            )
            .join(AssessmentQuestion, StudentScore.question_id == AssessmentQuestion.id)
            .join(Topic, AssessmentQuestion.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .where(
                StudentScore.student_id == student_id,
                Subject.id == subject_id,
                StudentScore.is_absent == False,
            )
            .group_by(Topic.id, Topic.name, Subject.name)
        )
        rows = result.all()

        topic_performances = []
        for row in rows:
            total_max = row.total_max or 1
            accuracy = (row.total_obtained or 0) / total_max
            topic_performances.append(
                TopicPerformance(
                    topic_id=row.topic_id,
                    topic_name=row.topic_name,
                    subject_name=row.subject_name,
                    accuracy_score=round(accuracy, 4),
                    is_weak=accuracy < 0.60,
                    assessment_count=1,
                )
            )
        return topic_performances

    async def _get_attendance_summary(
        self, student_id: uuid.UUID
    ) -> AttendanceSummary:
        result = await self.db.execute(
            select(
                func.count(AttendanceRecord.id).label("total"),
                func.sum(
                    func.cast(AttendanceRecord.is_present, int)
                ).label("present"),
                func.sum(
                    func.cast(AttendanceRecord.is_late, int)
                ).label("late"),
            )
            .where(AttendanceRecord.student_id == student_id)
        )
        row = result.one()
        total = row.total or 0
        present = int(row.present or 0)
        late = int(row.late or 0)
        absent = total - present

        return AttendanceSummary(
            total_sessions=total,
            attended=present,
            absent=absent,
            late=late,
            attendance_percentage=round((present / total * 100) if total > 0 else 0, 2),
        )

    async def _get_weak_topics(
        self, student_id: uuid.UUID
    ) -> list[WeakTopicSummary]:
        result = await self.db.execute(
            select(WeakTopic)
            .where(
                WeakTopic.student_id == student_id,
                WeakTopic.is_resolved == False,
            )
            .options(selectinload(WeakTopic.topic).selectinload(Topic.subject))
            .order_by(WeakTopic.severity_score.desc())
            .limit(10)
        )
        weak_topics = result.scalars().all()

        return [
            WeakTopicSummary(
                topic_id=wt.topic_id,
                topic_name=wt.topic.name,
                subject_name=wt.topic.subject.name,
                accuracy_score=wt.accuracy_score,
                severity_score=wt.severity_score,
                ai_reasoning=wt.ai_reasoning,
                last_detected=wt.updated_at,
            )
            for wt in weak_topics
        ]

    async def _get_score_trend(
        self, student_id: uuid.UUID
    ) -> list[PerformanceTrend]:
        """Last 10 assessment scores for trend chart."""
        from app.models.assessment import Assessment

        result = await self.db.execute(
            select(
                Assessment.name.label("assessment_name"),
                Assessment.held_on.label("assessment_date"),
                Subject.name.label("subject_name"),
                func.sum(StudentScore.marks_obtained).label("total_obtained"),
                func.sum(AssessmentQuestion.max_marks).label("total_max"),
            )
            .join(AssessmentQuestion, StudentScore.question_id == AssessmentQuestion.id)
            .join(Assessment, StudentScore.assessment_id == Assessment.id)
            .join(Topic, AssessmentQuestion.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .where(
                StudentScore.student_id == student_id,
                StudentScore.is_absent == False,
            )
            .group_by(Assessment.id, Assessment.name, Assessment.held_on, Subject.name)
            .order_by(Assessment.held_on.desc())
            .limit(10)
        )
        rows = result.all()

        return [
            PerformanceTrend(
                assessment_name=row.assessment_name,
                assessment_date=str(row.assessment_date or ""),
                score_percentage=round(
                    (row.total_obtained / row.total_max * 100) if row.total_max else 0, 2
                ),
                subject=row.subject_name,
            )
            for row in reversed(rows)  # Chronological order
        ]

    async def invalidate_student_cache(self, student_id: uuid.UUID) -> None:
        """Call this whenever new scores are entered for a student."""
        await self.cache.delete(f"student_analytics:{student_id}")
        logger.debug("Analytics cache invalidated", student_id=str(student_id))
