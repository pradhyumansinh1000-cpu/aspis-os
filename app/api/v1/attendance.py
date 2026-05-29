"""
app/api/v1/attendance.py — Attendance Tracking Endpoints
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, require_teacher
from app.core.exceptions import NotFoundError
from app.database import get_db
from app.models.attendance import AttendanceRecord, AttendanceSession, SessionType
from app.models.student import Student
from app.schemas.base import MessageResponse, SuccessResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post(
    "/sessions",
    response_model=SuccessResponse[dict],
    status_code=status.HTTP_201_CREATED,
    summary="Create an attendance session (class period)",
    dependencies=[Depends(require_teacher)],
)
async def create_session(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    subject_id: uuid.UUID,
    session_date: date,
    grade: str,
    section: str | None = None,
    session_type: SessionType = SessionType.LECTURE,
    period_number: int | None = None,
):
    """Create a new attendance session (one class period)."""
    # Resolve teacher ID from user
    from app.models.teacher import Teacher
    teacher_result = await db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = teacher_result.scalar_one_or_none()
    if not teacher:
        from app.core.exceptions import ForbiddenError
        raise ForbiddenError("Only teachers can create attendance sessions")

    session = AttendanceSession(
        institution_id=current_user.institution_id,
        subject_id=subject_id,
        teacher_id=teacher.id,
        session_date=session_date,
        session_type=session_type,
        grade=grade,
        section=section,
        period_number=period_number,
    )
    db.add(session)
    await db.flush()

    return SuccessResponse(data={
        "session_id": str(session.id),
        "session_date": str(session_date),
        "grade": grade,
        "section": section,
    })


@router.post(
    "/sessions/{session_id}/mark",
    response_model=SuccessResponse[dict],
    summary="Mark attendance for all students in a session",
    dependencies=[Depends(require_teacher)],
)
async def mark_attendance(
    session_id: uuid.UUID,
    attendance_data: list[dict],  # [{"student_id": "uuid", "is_present": bool, "is_late": bool}]
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Bulk attendance marking for a session.
    attendance_data: list of {"student_id": "...", "is_present": true, "is_late": false}
    """
    session_result = await db.execute(
        select(AttendanceSession).where(AttendanceSession.id == session_id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Attendance Session", str(session_id))

    records_created = 0
    for item in attendance_data:
        student_id = uuid.UUID(item["student_id"])
        is_present = bool(item.get("is_present", False))

        record = AttendanceRecord(
            session_id=session_id,
            student_id=student_id,
            is_present=is_present,
            is_late=bool(item.get("is_late", False)),
            minutes_late=item.get("minutes_late"),
            absence_reason=item.get("absence_reason"),
        )
        db.add(record)
        records_created += 1

        # Update cached attendance percentage on Student model
        if is_present:
            await db.execute(
                select(Student).where(Student.id == student_id)
            )  # Will be updated by analytics task

    await db.flush()
    return SuccessResponse(data={
        "session_id": str(session_id),
        "records_marked": records_created,
        "message": "Attendance marked successfully",
    })


@router.get(
    "/student/{student_id}/summary",
    response_model=SuccessResponse[dict],
    summary="Get attendance summary for a student",
)
async def get_attendance_summary(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
):
    """Returns overall and subject-wise attendance percentages."""
    query = (
        select(
            func.count(AttendanceRecord.id).label("total"),
            func.sum(func.cast(AttendanceRecord.is_present, int)).label("present"),
        )
        .where(AttendanceRecord.student_id == student_id)
    )

    if from_date or to_date:
        query = query.join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
        if from_date:
            query = query.where(AttendanceSession.session_date >= from_date)
        if to_date:
            query = query.where(AttendanceSession.session_date <= to_date)

    result = await db.execute(query)
    row = result.one()
    total = row.total or 0
    present = int(row.present or 0)

    return SuccessResponse(data={
        "student_id": str(student_id),
        "total_sessions": total,
        "attended": present,
        "absent": total - present,
        "attendance_percentage": round((present / total * 100) if total > 0 else 0, 2),
        "from_date": str(from_date) if from_date else None,
        "to_date": str(to_date) if to_date else None,
    })
