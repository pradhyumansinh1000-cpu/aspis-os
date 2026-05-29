"""
app/api/v1/reports.py — AI Report Generation Endpoints
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, require_teacher
from app.core.exceptions import NotFoundError
from app.database import get_db
from app.models.ai_report import AIReport, ReportStatus, ReportType
from app.schemas.base import SuccessResponse, MessageResponse
from app.tasks.report_tasks import generate_student_report

router = APIRouter(prefix="/reports", tags=["AI Reports"])


@router.post(
    "/generate",
    response_model=SuccessResponse[dict],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger AI report generation for a student",
    dependencies=[Depends(require_teacher)],
)
async def trigger_report(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    student_id: uuid.UUID,
    report_type: ReportType = ReportType.WEEKLY,
):
    """
    Enqueues an AI report generation task.
    Report is generated asynchronously by Llama 70B.
    Poll GET /reports/{report_id} for the result.
    """
    # Create pending report record
    report = AIReport(
        student_id=student_id,
        institution_id=current_user.institution_id,
        report_type=report_type,
        status=ReportStatus.PENDING,
    )
    db.add(report)
    await db.flush()

    # Enqueue task
    task = generate_student_report.delay(str(report.id))
    report.task_id = task.id
    await db.flush()

    return SuccessResponse(data={
        "report_id": str(report.id),
        "task_id": task.id,
        "status": "pending",
        "report_type": report_type.value,
        "message": "Report generation started. Poll the report_id URL for result.",
        "polling_url": f"/api/v1/reports/{report.id}",
    })


@router.get(
    "/{report_id}",
    response_model=SuccessResponse[dict],
    summary="Get a generated AI report",
)
async def get_report(
    report_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """Fetch a report by ID. Returns status + content when complete."""
    result = await db.execute(
        select(AIReport).where(AIReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise NotFoundError("Report", str(report_id))

    return SuccessResponse(data={
        "report_id": str(report.id),
        "report_type": report.report_type.value,
        "status": report.status.value,
        "content": report.content,
        "model_version": report.model_version,
        "generation_time_ms": report.generation_time_ms,
        "error_message": report.error_message,
        "created_at": report.created_at.isoformat(),
    })


@router.get(
    "/student/{student_id}",
    response_model=SuccessResponse[list],
    summary="Get all reports for a student",
)
async def get_student_reports(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    report_type: ReportType | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
):
    """Returns the latest AI reports for a student, newest first."""
    query = (
        select(AIReport)
        .where(
            AIReport.student_id == student_id,
            AIReport.status == ReportStatus.COMPLETED,
        )
        .order_by(AIReport.created_at.desc())
        .limit(limit)
    )
    if report_type:
        query = query.where(AIReport.report_type == report_type)

    result = await db.execute(query)
    reports = result.scalars().all()

    return SuccessResponse(data=[
        {
            "report_id": str(r.id),
            "report_type": r.report_type.value,
            "content": r.content,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ])
