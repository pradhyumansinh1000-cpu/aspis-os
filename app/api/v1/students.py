"""
app/api/v1/students.py — Student Management & Analytics Endpoints
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import (
    CurrentUser,
    RedisClient,
    require_roles,
    require_teacher,
)
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError_
from app.database import get_db
from app.models.student import Student
from app.models.user import User, UserRole
from app.redis_client import RedisCache
from app.schemas.analytics import StudentAnalyticsResponse
from app.schemas.base import MessageResponse, PaginatedResponse, PaginationMeta, SuccessResponse
from app.schemas.student import StudentCreateRequest
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/students", tags=["Students"])


# ─── List Students ────────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=PaginatedResponse[dict],
    summary="List students in the institution",
    dependencies=[Depends(require_teacher)],
)
async def list_students(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    grade: str | None = Query(None, description="Filter by grade"),
    section: str | None = Query(None, description="Filter by section"),
    search: str | None = Query(None, description="Search by name or roll number"),
):
    """
    Paginated list of students. Teachers see only their institution's students.
    Supports filtering by grade, section, and name/roll search.
    """
    query = (
        select(Student)
        .join(User, Student.user_id == User.id)
        .where(
            Student.institution_id == current_user.institution_id,
            Student.deleted_at.is_(None),
        )
        .options(selectinload(Student.user))
    )

    if grade:
        query = query.where(Student.grade == grade)
    if section:
        query = query.where(Student.section == section)
    if search:
        query = query.where(
            (User.first_name.ilike(f"%{search}%"))
            | (User.last_name.ilike(f"%{search}%"))
            | (Student.roll_number.ilike(f"%{search}%"))
        )

    # Count total
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # Paginate
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    students = result.scalars().all()

    data = [
        {
            "id": str(s.id),
            "name": s.user.full_name,
            "email": s.user.email,
            "roll_number": s.roll_number,
            "grade": s.grade,
            "section": s.section,
            "overall_grade_point": s.overall_grade_point,
            "attendance_percentage": s.attendance_percentage,
        }
        for s in students
    ]

    total_pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        data=data,
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        ),
    )


# ─── Get Student Profile ──────────────────────────────────────────────────────
@router.get(
    "/{student_id}",
    response_model=SuccessResponse[dict],
    summary="Get student profile",
)
async def get_student(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Returns student profile. Access rules:
    - Student: can only access their own profile
    - Teacher/Admin: any student in their institution
    - Parent: only their linked child
    """
    result = await db.execute(
        select(Student)
        .where(Student.id == student_id, Student.deleted_at.is_(None))
        .options(selectinload(Student.user))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise NotFoundError("Student", str(student_id))

    # Tenant check
    if student.institution_id != current_user.institution_id:
        raise ForbiddenError("Access to student from another institution is not allowed")

    # Role-based access
    if current_user.role == UserRole.STUDENT:
        student_profile_result = await db.execute(
            select(Student).where(Student.user_id == current_user.id)
        )
        own_student = student_profile_result.scalar_one_or_none()
        if not own_student or own_student.id != student_id:
            raise ForbiddenError("Students can only access their own profile")

    if current_user.role == UserRole.PARENT:
        parent_student_result = await db.execute(
            select(Student).where(
                Student.parent_user_id == current_user.id,
                Student.id == student_id,
            )
        )
        if not parent_student_result.scalar_one_or_none():
            raise ForbiddenError("Parents can only access their own child's profile")

    return SuccessResponse(data={
        "id": str(student.id),
        "name": student.user.full_name,
        "email": student.user.email,
        "roll_number": student.roll_number,
        "grade": student.grade,
        "section": student.section,
        "academic_year": student.academic_year,
        "date_of_birth": str(student.date_of_birth) if student.date_of_birth else None,
        "overall_grade_point": student.overall_grade_point,
        "attendance_percentage": student.attendance_percentage,
    })


# ─── Student Analytics ────────────────────────────────────────────────────────
@router.get(
    "/{student_id}/analytics",
    response_model=SuccessResponse[StudentAnalyticsResponse],
    summary="Get full performance analytics for a student",
)
async def get_student_analytics(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    redis: RedisClient,
    force_refresh: bool = Query(False, description="Bypass cache and recompute"),
):
    """
    Full analytics: subject performance, topic breakdown, attendance,
    weak topics, score trend. Cached for 1 hour.
    """
    cache = RedisCache(redis, "analytics")
    service = AnalyticsService(db, cache)
    analytics = await service.get_student_analytics(student_id, force_refresh=force_refresh)
    return SuccessResponse(data=analytics)


# ─── Weak Topics ──────────────────────────────────────────────────────────────
@router.get(
    "/{student_id}/weak-topics",
    response_model=SuccessResponse[list],
    summary="Get AI-detected weak topics for a student",
)
async def get_weak_topics(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """Returns current weak topics with AI reasoning and severity scores."""
    from app.models.weak_topic import WeakTopic
    from app.models.subject import Topic, Subject

    result = await db.execute(
        select(WeakTopic)
        .where(WeakTopic.student_id == student_id, WeakTopic.is_resolved == False)
        .options(selectinload(WeakTopic.topic).selectinload(Topic.subject))
        .order_by(WeakTopic.severity_score.desc())
    )
    weak_topics = result.scalars().all()

    data = [
        {
            "id": str(wt.id),
            "topic_name": wt.topic.name,
            "subject_name": wt.topic.subject.name,
            "accuracy_score": wt.accuracy_score,
            "severity_score": wt.severity_score,
            "ai_reasoning": wt.ai_reasoning,
            "data_points": wt.data_points,
            "detected_at": wt.created_at.isoformat(),
        }
        for wt in weak_topics
    ]
    return SuccessResponse(data=data)


# ─── Recommendations ─────────────────────────────────────────────────────────
@router.get(
    "/{student_id}/recommendations",
    response_model=SuccessResponse[list],
    summary="Get personalized study recommendations",
)
async def get_recommendations(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    status_filter: str | None = Query(None, description="Filter by status: pending, viewed, completed"),
):
    """Returns AI-generated personalized study recommendations sorted by priority."""
    from app.models.recommendation import Recommendation, RecommendationStatus

    query = select(Recommendation).where(
        Recommendation.student_id == student_id
    ).order_by(Recommendation.priority)

    if status_filter:
        try:
            status_enum = RecommendationStatus(status_filter)
            query = query.where(Recommendation.status == status_enum)
        except ValueError:
            pass

    result = await db.execute(query)
    recs = result.scalars().all()

    data = [
        {
            "id": str(r.id),
            "title": r.title,
            "description": r.description,
            "type": r.recommendation_type,
            "priority": r.priority,
            "status": r.status,
            "action_plan": r.action_plan,
            "expected_improvement": r.expected_score_improvement,
            "created_at": r.created_at.isoformat(),
        }
        for r in recs
    ]
    return SuccessResponse(data=data)


@router.patch(
    "/{student_id}/recommendations/{rec_id}/status",
    response_model=MessageResponse,
    summary="Update recommendation status",
)
async def update_recommendation_status(
    student_id: uuid.UUID,
    rec_id: uuid.UUID,
    new_status: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """Student marks a recommendation as viewed, in_progress, or completed."""
    from app.models.recommendation import Recommendation, RecommendationStatus

    result = await db.execute(
        select(Recommendation).where(
            Recommendation.id == rec_id,
            Recommendation.student_id == student_id,
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise NotFoundError("Recommendation", str(rec_id))

    try:
        rec.status = RecommendationStatus(new_status)
    except ValueError:
        from app.core.exceptions import ValidationError_
        raise ValidationError_(f"Invalid status: {new_status}")

    db.add(rec)
    return MessageResponse(message=f"Recommendation status updated to {new_status}")


# ─── Add Student (Enroll) ──────────────────────────────────────────────────────
@router.post(
    "",
    response_model=SuccessResponse[dict],
    status_code=status.HTTP_201_CREATED,
    summary="Add a new student to the institution",
    dependencies=[Depends(require_teacher)],
)
async def add_student(
    data: StudentCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Onboard/enroll a new student.
    Creates both the core login User record and the Student profile atomically.
    Teachers can only add students to their own institution.
    """
    # 1. Check if email already exists
    from app.core.security import hash_password

    email_check = await db.execute(select(User).where(User.email == data.email))
    if email_check.scalar_one_or_none():
        raise ValidationError_("A user with this email address already exists")

    # 2. Create the associated User profile
    # Set a default initial password: "Welcome@<roll_number>"
    default_pass = f"Welcome@{data.roll_number}"
    hashed = hash_password(default_pass)

    new_user = User(
        email=data.email,
        phone=data.phone,
        hashed_password=hashed,
        role=UserRole.STUDENT,
        first_name=data.first_name,
        last_name=data.last_name,
        institution_id=current_user.institution_id,
        is_active=True,
        is_verified=True,
    )
    db.add(new_user)
    await db.flush() # get new_user.id

    # 3. Create the Student demographic profile
    new_student = Student(
        user_id=new_user.id,
        institution_id=current_user.institution_id,
        roll_number=data.roll_number,
        grade=data.grade,
        section=data.section,
        academic_year=data.academic_year,
        date_of_birth=data.date_of_birth,
    )
    db.add(new_student)
    await db.commit() # commit transaction
    await db.refresh(new_student)

    return SuccessResponse(data={
        "student_id": str(new_student.id),
        "user_id": str(new_user.id),
        "name": new_user.full_name,
        "email": new_user.email,
        "roll_number": new_student.roll_number,
        "grade": new_student.grade,
        "section": new_student.section,
        "default_temporary_password": default_pass,
    })


# ─── Remove Student ───────────────────────────────────────────────────────────
@router.delete(
    "/{student_id}",
    response_model=MessageResponse,
    summary="Remove/soft-delete a student from the institution",
    dependencies=[Depends(require_teacher)],
)
async def remove_student(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Remove a student from the system.
    Soft-deletes both the Student profile and the login User account to disable access.
    """
    # 1. Fetch Student profile
    result = await db.execute(
        select(Student)
        .where(Student.id == student_id, Student.deleted_at.is_(None))
        .options(selectinload(Student.user))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise NotFoundError("Student", str(student_id))

    # 2. Institutional access guard
    if student.institution_id != current_user.institution_id:
        raise ForbiddenError("Access to student from another institution is not allowed")

    # 3. Soft delete Student & User records
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    student.deleted_at = now
    if student.user:
        student.user.deleted_at = now
        student.user.is_active = False

    db.add(student)
    if student.user:
        db.add(student.user)
        
    await db.commit()

    return MessageResponse(message="Student successfully removed and login account disabled")
