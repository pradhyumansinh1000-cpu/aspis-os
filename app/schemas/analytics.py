"""
app/schemas/analytics.py — Analytics Response Schemas

These schemas define what the analytics APIs return.
Rich type hints = auto-generated OpenAPI docs with field descriptions.
"""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.base import BaseSchema


class TopicPerformance(BaseSchema):
    topic_id: uuid.UUID
    topic_name: str
    subject_name: str
    accuracy_score: float = Field(..., ge=0.0, le=1.0, description="0.0–1.0")
    is_weak: bool
    assessment_count: int


class SubjectPerformance(BaseSchema):
    subject_id: uuid.UUID
    subject_name: str
    average_score: float         # 0–100
    highest_score: float
    lowest_score: float
    assessment_count: int
    topics: list[TopicPerformance] = []


class AttendanceSummary(BaseSchema):
    total_sessions: int
    attended: int
    absent: int
    late: int
    attendance_percentage: float
    by_subject: dict[str, float] = {}  # subject_name → attendance %


class PerformanceTrend(BaseSchema):
    """Score trend over assessments — used for the trend chart."""
    assessment_name: str
    assessment_date: str
    score_percentage: float
    subject: str


class WeakTopicSummary(BaseSchema):
    topic_id: uuid.UUID
    topic_name: str
    subject_name: str
    accuracy_score: float
    severity_score: float
    ai_reasoning: str | None = None
    last_detected: datetime


class StudentAnalyticsResponse(BaseSchema):
    """Full analytics payload for a student."""
    student_id: uuid.UUID
    student_name: str
    grade: str
    section: str | None
    academic_year: str
    overall_score: float | None
    rank_in_class: int | None

    attendance: AttendanceSummary
    subject_performances: list[SubjectPerformance]
    weak_topics: list[WeakTopicSummary]
    score_trend: list[PerformanceTrend]

    generated_at: datetime


class ClassAnalyticsResponse(BaseSchema):
    """Aggregate analytics for a grade/section — for teacher dashboard."""
    grade: str
    section: str | None
    student_count: int
    class_average: float
    top_score: float
    lowest_score: float
    subject_averages: dict[str, float]       # subject_name → avg score
    common_weak_topics: list[str]            # Most commonly weak topics
    attendance_average: float
    at_risk_student_count: int               # Students with score < 40%


class InstitutionAnalyticsResponse(BaseSchema):
    """Admin-level institution-wide analytics."""
    institution_id: uuid.UUID
    total_students: int
    total_teachers: int
    overall_average_score: float
    attendance_average: float
    grade_breakdown: dict[str, ClassAnalyticsResponse]
    reports_generated: int
    ai_usage_stats: dict[str, int]  # {"ocr_jobs": 245, "reports": 892, ...}
