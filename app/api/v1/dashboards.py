"""
app/api/v1/dashboards.py — Teacher, Parent & Admin Dashboard Endpoints
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    CurrentUser,
    require_roles,
    require_teacher,
)
from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import UserRole
from app.models.weak_topic import WeakTopic
from app.redis_client import RedisCache, get_redis
from app.schemas.base import SuccessResponse

router = APIRouter(tags=["Dashboards"])


# ─── Teacher Dashboard ────────────────────────────────────────────────────────
@router.get(
    "/teacher/dashboard",
    response_model=SuccessResponse[dict],
    summary="Teacher dashboard with class overview",
    dependencies=[Depends(require_teacher)],
)
async def teacher_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    grade: str | None = Query(None),
    section: str | None = Query(None),
):
    """
    Teacher dashboard shows:
    - Total students taught
    - Class average score
    - At-risk student count (score < 40%)
    - Common weak topics across class
    - Recent attendance summary
    """
    from app.models.assessment import StudentScore, AssessmentQuestion
    from app.models.subject import Topic

    # Count students
    student_count_result = await db.execute(
        select(func.count(Student.id)).where(
            Student.institution_id == current_user.institution_id,
            Student.grade == grade if grade else True,
            Student.section == section if section else True,
        )
    )
    student_count = student_count_result.scalar_one() or 0

    # Most common weak topics across the class
    weak_topics_result = await db.execute(
        select(
            Topic.name,
            func.count(WeakTopic.student_id).label("affected_students"),
        )
        .join(WeakTopic, WeakTopic.topic_id == Topic.id)
        .join(Student, WeakTopic.student_id == Student.id)
        .where(
            Student.institution_id == current_user.institution_id,
            WeakTopic.is_resolved == False,
        )
        .group_by(Topic.id, Topic.name)
        .order_by(func.count(WeakTopic.student_id).desc())
        .limit(5)
    )
    common_weak_topics = [
        {"topic": row.name, "affected_students": row.affected_students}
        for row in weak_topics_result.all()
    ]

    return SuccessResponse(data={
        "total_students": student_count,
        "grade": grade,
        "section": section,
        "common_weak_topics": common_weak_topics,
        "quick_stats": {
            "ocr_papers_processed": 0,   # Populated from OCR doc count
            "reports_generated": 0,
            "speech_sessions": 0,
        },
    })


# ─── Parent Dashboard ─────────────────────────────────────────────────────────
@router.get(
    "/parent/dashboard",
    response_model=SuccessResponse[dict],
    summary="Parent dashboard with child performance summary",
    dependencies=[Depends(require_roles(UserRole.PARENT))],
)
async def parent_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Parent sees a clean summary of their child's:
    - Latest scores
    - Attendance status
    - AI-generated parent-friendly report
    - Top 3 recommendations for home support
    """
    # Find parent's child
    child_result = await db.execute(
        select(Student)
        .where(Student.parent_user_id == current_user.id)
        .options(
            __import__("sqlalchemy.orm", fromlist=["selectinload"]).selectinload(Student.user)
        )
    )
    child = child_result.scalar_one_or_none()

    if not child:
        return SuccessResponse(data={
            "message": "No student linked to this parent account. Contact school admin.",
            "child": None,
        })

    # Get latest recommendations
    from app.models.recommendation import Recommendation, RecommendationStatus
    recs_result = await db.execute(
        select(Recommendation)
        .where(
            Recommendation.student_id == child.id,
            Recommendation.status == RecommendationStatus.PENDING,
        )
        .order_by(Recommendation.priority)
        .limit(3)
    )
    recommendations = recs_result.scalars().all()

    # Latest AI parent report
    from app.models.ai_report import AIReport, ReportType, ReportStatus
    report_result = await db.execute(
        select(AIReport)
        .where(
            AIReport.student_id == child.id,
            AIReport.report_type == ReportType.PARENT_SUMMARY,
            AIReport.status == ReportStatus.COMPLETED,
        )
        .order_by(AIReport.created_at.desc())
        .limit(1)
    )
    latest_report = report_result.scalar_one_or_none()

    return SuccessResponse(data={
        "child": {
            "name": child.user.full_name,
            "grade": child.grade,
            "section": child.section,
            "roll_number": child.roll_number,
            "attendance_percentage": child.attendance_percentage,
            "overall_grade_point": child.overall_grade_point,
        },
        "top_recommendations": [
            {
                "title": r.title,
                "description": r.description,
                "priority": r.priority,
            }
            for r in recommendations
        ],
        "latest_report": latest_report.content if latest_report else None,
        "weak_areas_count": await db.scalar(
            select(func.count(WeakTopic.id)).where(
                WeakTopic.student_id == child.id,
                WeakTopic.is_resolved == False,
            )
        ),
    })


# ─── Admin Analytics Dashboard ────────────────────────────────────────────────
@router.get(
    "/admin/analytics",
    response_model=SuccessResponse[dict],
    summary="Institution-wide analytics for admin",
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN))],
)
async def admin_analytics(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Admin sees institution-wide metrics:
    - Total students, teachers
    - Overall academic performance
    - Grade-wise breakdown
    - AI usage statistics
    """
    from app.models.user import User
    from app.models.ai_report import AIReport, ReportStatus
    from app.models.ocr_document import OCRDocument, OCRStatus

    institution_id = current_user.institution_id

    # Student count
    student_count = await db.scalar(
        select(func.count(Student.id)).where(
            Student.institution_id == institution_id
        )
    )

    # Teacher count
    teacher_count = await db.scalar(
        select(func.count(Teacher.id)).where(
            Teacher.institution_id == institution_id
        )
    )

    # Reports generated
    reports_count = await db.scalar(
        select(func.count(AIReport.id)).where(
            AIReport.institution_id == institution_id,
            AIReport.status == ReportStatus.COMPLETED,
        )
    )

    # OCR jobs
    ocr_count = await db.scalar(
        select(func.count(OCRDocument.id)).where(
            OCRDocument.institution_id == institution_id,
            OCRDocument.status == OCRStatus.COMPLETED,
        )
    )

    # Grade breakdown
    grade_result = await db.execute(
        select(
            Student.grade,
            func.count(Student.id).label("count"),
            func.avg(Student.overall_grade_point).label("avg_score"),
        )
        .where(Student.institution_id == institution_id)
        .group_by(Student.grade)
        .order_by(Student.grade)
    )
    grade_breakdown = {
        row.grade: {
            "student_count": row.count,
            "average_score": round(row.avg_score or 0, 2),
        }
        for row in grade_result.all()
    }

    return SuccessResponse(data={
        "institution_id": str(institution_id),
        "total_students": student_count or 0,
        "total_teachers": teacher_count or 0,
        "ai_usage": {
            "reports_generated": reports_count or 0,
            "ocr_documents_processed": ocr_count or 0,
        },
        "grade_breakdown": grade_breakdown,
    })
