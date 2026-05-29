"""
app/api/v1/behavioral.py — Behavioral Profile API

Teachers record behavioral observations here.
The analytics engine aggregates these into the intelligence profile.

Design principle:
  Teachers should be able to fill this in 30 seconds per student.
  Designed for quick weekly entry, not lengthy reports.
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
from app.models.behavioral_record import (
    BehavioralRecord,
    IncidentSeverity,
    LearningStyle,
    ObservationType,
)
from app.schemas.base import MessageResponse, SuccessResponse

router = APIRouter(prefix="/behavioral", tags=["Behavioral Profile"])


@router.post(
    "/{student_id}/record",
    response_model=SuccessResponse[dict],
    status_code=status.HTTP_201_CREATED,
    summary="Record a behavioral observation for a student",
    dependencies=[Depends(require_teacher)],
)
async def record_observation(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    observation_date: date = Query(default=None),
    observation_type: ObservationType = ObservationType.WEEKLY,
    participation_score: float | None = Query(None, ge=0, le=10),
    assignment_consistency: float | None = Query(None, ge=0, le=10),
    communication_score: float | None = Query(None, ge=0, le=10),
    teamwork_score: float | None = Query(None, ge=0, le=10),
    leadership_score: float | None = Query(None, ge=0, le=10),
    creativity_score: float | None = Query(None, ge=0, le=10),
    self_discipline_score: float | None = Query(None, ge=0, le=10),
    observed_learning_style: LearningStyle | None = None,
    incident_severity: IncidentSeverity | None = None,
    incident_description: str | None = None,
    notes: str | None = None,
    subject_context: str | None = None,
):
    """
    Record a behavioral observation for a student.
    
    All score fields are optional — fill in only what you observed.
    Scale: 0 (very poor) to 10 (excellent).
    
    For incidents, use incident_severity and incident_description.
    
    After recording, trigger a background profile rebuild if significant.
    """
    from datetime import date as date_type
    obs_date = observation_date or date_type.today()

    record = BehavioralRecord(
        student_id=student_id,
        institution_id=current_user.institution_id,
        observer_id=current_user.id,
        observation_date=obs_date,
        observation_type=observation_type,
        subject_context=subject_context,
        participation_score=participation_score,
        assignment_consistency=assignment_consistency,
        communication_score=communication_score,
        teamwork_score=teamwork_score,
        leadership_score=leadership_score,
        creativity_score=creativity_score,
        self_discipline_score=self_discipline_score,
        observed_learning_style=observed_learning_style,
        incident_severity=incident_severity,
        incident_description=incident_description,
        notes=notes,
    )
    db.add(record)
    await db.flush()

    # Trigger profile rebuild for serious incidents
    if incident_severity in (IncidentSeverity.SERIOUS, IncidentSeverity.MODERATE):
        from app.tasks.intelligence_tasks import build_intelligence_profile
        build_intelligence_profile.delay(str(student_id))

    return SuccessResponse(data={
        "record_id": str(record.id),
        "student_id": str(student_id),
        "observation_date": str(obs_date),
        "message": "Behavioral observation recorded successfully",
    })


@router.get(
    "/{student_id}/profile",
    response_model=SuccessResponse[dict],
    summary="Get aggregated behavioral profile for a student",
)
async def get_behavioral_profile(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    last_n_weeks: int = Query(12, ge=1, le=52),
):
    """
    Returns aggregated behavioral metrics over the last N weeks.
    
    Includes:
    - Average scores per dimension
    - Trend (improving/declining/stable)
    - Most common observed learning style
    - Incident summary
    - Composite behavioral score (used in ML risk model)
    """
    result = await db.execute(
        select(
            func.avg(BehavioralRecord.participation_score).label("participation"),
            func.avg(BehavioralRecord.assignment_consistency).label("assignment"),
            func.avg(BehavioralRecord.communication_score).label("communication"),
            func.avg(BehavioralRecord.teamwork_score).label("teamwork"),
            func.avg(BehavioralRecord.leadership_score).label("leadership"),
            func.avg(BehavioralRecord.creativity_score).label("creativity"),
            func.avg(BehavioralRecord.self_discipline_score).label("self_discipline"),
            func.count(BehavioralRecord.id).label("total_records"),
        )
        .where(BehavioralRecord.student_id == student_id)
    )
    row = result.one()

    # Count incidents
    incidents_result = await db.execute(
        select(
            BehavioralRecord.incident_severity,
            func.count(BehavioralRecord.id).label("count"),
        )
        .where(
            BehavioralRecord.student_id == student_id,
            BehavioralRecord.incident_severity.isnot(None),
        )
        .group_by(BehavioralRecord.incident_severity)
    )
    incidents = {row.incident_severity: row.count for row in incidents_result.all()}

    # Compute composite score
    scores = {
        "participation": float(row.participation or 0),
        "assignment_consistency": float(row.assignment or 0),
        "communication": float(row.communication or 0),
        "teamwork": float(row.teamwork or 0),
        "leadership": float(row.leadership or 0),
        "creativity": float(row.creativity or 0),
        "self_discipline": float(row.self_discipline or 0),
    }
    filled = [v for v in scores.values() if v > 0]
    composite = sum(filled) / max(len(filled), 1)

    # Detect confidence level from participation + leadership
    participation = scores["participation"]
    leadership = scores["leadership"]
    confidence_index = (participation * 0.6 + leadership * 0.4)

    return SuccessResponse(data={
        "student_id": str(student_id),
        "observation_count": row.total_records or 0,
        "scores": scores,
        "composite_behavioral_score": round(composite, 2),
        "confidence_index": round(confidence_index, 2),
        "confidence_label": (
            "high" if confidence_index >= 7 else
            "moderate" if confidence_index >= 5 else
            "low"
        ),
        "incidents": {k.value if k else "unknown": v for k, v in incidents.items()},
        "interpretation": _interpret_behavioral(scores, composite),
    })


@router.get(
    "/{student_id}/history",
    response_model=SuccessResponse[list],
    summary="Get historical behavioral observations timeline",
)
async def get_behavioral_history(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
):
    """Returns individual observation records in reverse chronological order."""
    result = await db.execute(
        select(BehavioralRecord)
        .where(BehavioralRecord.student_id == student_id)
        .order_by(BehavioralRecord.observation_date.desc())
        .limit(limit)
    )
    records = result.scalars().all()

    return SuccessResponse(data=[
        {
            "id": str(r.id),
            "date": str(r.observation_date),
            "type": r.observation_type.value,
            "participation": r.participation_score,
            "assignment_consistency": r.assignment_consistency,
            "leadership": r.leadership_score,
            "communication": r.communication_score,
            "teamwork": r.teamwork_score,
            "self_discipline": r.self_discipline_score,
            "incident_severity": r.incident_severity.value if r.incident_severity else None,
            "incident_description": r.incident_description,
            "learning_style": r.observed_learning_style.value if r.observed_learning_style else None,
            "notes": r.notes,
        }
        for r in records
    ])


def _interpret_behavioral(scores: dict, composite: float) -> dict:
    """Rule-based behavioral interpretation (no LLM)."""
    flags = []

    if scores.get("participation", 0) < 4:
        flags.append("Low classroom participation — may indicate disengagement or low confidence")
    if scores.get("assignment_consistency", 0) < 4:
        flags.append("Poor assignment consistency — academic habits need attention")
    if scores.get("leadership", 0) >= 7 and scores.get("teamwork", 0) >= 7:
        flags.append("Strong leadership and teamwork — consider for group leader roles")
    if scores.get("creativity", 0) >= 8:
        flags.append("High creativity score — may benefit from project-based learning")
    if scores.get("self_discipline", 0) < 4 and scores.get("participation", 0) >= 7:
        flags.append("High participation but low discipline — may be impulsive rather than structured")

    return {
        "flags": flags,
        "overall": (
            "strong" if composite >= 7 else
            "adequate" if composite >= 5 else
            "needs_attention"
        ),
    }
