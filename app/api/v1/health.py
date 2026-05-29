"""
app/api/v1/health.py — Student Health Records API

Privacy-by-design:
  - No diagnosis names stored
  - No medication records
  - Only academically-relevant observations
  - Restricted to admin/nurse/teacher roles
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, require_teacher
from app.database import get_db
from app.models.health_record import (
    AttentionPattern,
    HealthEventType,
    HealthRecord,
)
from app.schemas.base import SuccessResponse

router = APIRouter(prefix="/health", tags=["Health & Wellness"])


@router.post(
    "/{student_id}/record",
    response_model=SuccessResponse[dict],
    status_code=status.HTTP_201_CREATED,
    summary="Record a health event for a student",
    dependencies=[Depends(require_teacher)],
)
async def add_health_record(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    event_type: HealthEventType = HealthEventType.MEDICAL_ABSENCE,
    record_date: date | None = None,
    affects_attendance: bool = False,
    affects_concentration: bool = False,
    duration_days: int | None = Query(None, ge=1),
    vision_flag: bool = False,
    hearing_flag: bool = False,
    nutritional_concern: bool = False,
    attention_pattern: AttentionPattern | None = None,
    fatigue_level: int | None = Query(None, ge=1, le=5),
    during_exam_period: bool = False,
    notes: str | None = None,
):
    """
    Record a health-related event.

    Note: Store only academically-relevant observations.
    Do NOT record specific diagnoses or medications.
    
    Event types:
    - medical_absence: Student absent due to illness
    - screening_result: Annual vision/hearing/BMI screening
    - teacher_observation: Fatigue, headache, concentration concern
    - nurse_visit: Visited school nurse
    - chronic_flag: Long-term health concern flag
    """
    from datetime import date as date_type
    rec_date = record_date or date_type.today()

    record = HealthRecord(
        student_id=student_id,
        institution_id=current_user.institution_id,
        recorded_by=current_user.id,
        record_date=rec_date,
        event_type=event_type,
        affects_attendance=affects_attendance,
        affects_concentration=affects_concentration,
        duration_days=duration_days,
        vision_flag=vision_flag,
        hearing_flag=hearing_flag,
        nutritional_concern=nutritional_concern,
        attention_pattern=attention_pattern,
        fatigue_level=fatigue_level,
        during_exam_period=during_exam_period,
        notes=notes,
    )
    db.add(record)
    await db.flush()

    # If chronic or vision/hearing flag — trigger profile rebuild immediately
    if vision_flag or hearing_flag or event_type == HealthEventType.CHRONIC_FLAG:
        from app.tasks.intelligence_tasks import build_intelligence_profile
        build_intelligence_profile.delay(str(student_id))

    return SuccessResponse(data={
        "record_id": str(record.id),
        "event_type": event_type.value,
        "record_date": str(rec_date),
        "message": "Health record added",
    })


@router.get(
    "/{student_id}/profile",
    response_model=SuccessResponse[dict],
    summary="Get health impact profile for a student",
)
async def get_health_profile(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Returns health summary focused on academic impact.
    
    Key insights:
    - Total and exam-period absence count
    - Vision/hearing concern flags
    - Attention/focus patterns observed
    - Health risk score (for ML model input)
    """
    # Absence counts
    total_absence = await db.scalar(
        select(func.count(HealthRecord.id)).where(
            HealthRecord.student_id == student_id,
            HealthRecord.event_type == HealthEventType.MEDICAL_ABSENCE,
        )
    )

    exam_absence = await db.scalar(
        select(func.count(HealthRecord.id)).where(
            HealthRecord.student_id == student_id,
            HealthRecord.during_exam_period == True,
        )
    )

    vision_flag = await db.scalar(
        select(func.count(HealthRecord.id)).where(
            HealthRecord.student_id == student_id,
            HealthRecord.vision_flag == True,
        )
    )

    hearing_flag = await db.scalar(
        select(func.count(HealthRecord.id)).where(
            HealthRecord.student_id == student_id,
            HealthRecord.hearing_flag == True,
        )
    )

    # Most recent attention pattern
    latest_attention = await db.execute(
        select(HealthRecord.attention_pattern)
        .where(
            HealthRecord.student_id == student_id,
            HealthRecord.attention_pattern.isnot(None),
        )
        .order_by(HealthRecord.record_date.desc())
        .limit(1)
    )
    attention_row = latest_attention.one_or_none()
    attention = attention_row[0].value if attention_row and attention_row[0] else "normal"

    # Compute health risk score (0-100, input to ML model)
    health_risk = _compute_health_risk(
        total_absence or 0,
        exam_absence or 0,
        bool(vision_flag),
        bool(hearing_flag),
        attention,
    )

    return SuccessResponse(data={
        "student_id": str(student_id),
        "total_medical_absences": total_absence or 0,
        "exam_period_absences": exam_absence or 0,
        "vision_concern": bool(vision_flag),
        "hearing_concern": bool(hearing_flag),
        "attention_pattern": attention,
        "health_risk_score": health_risk,
        "health_risk_label": (
            "critical" if health_risk >= 70 else
            "high" if health_risk >= 45 else
            "moderate" if health_risk >= 20 else
            "low"
        ),
        "flags": _generate_health_flags(total_absence or 0, exam_absence or 0, bool(vision_flag), attention),
    })


@router.get(
    "/{student_id}/history",
    response_model=SuccessResponse[list],
    summary="Get health event history for a student",
)
async def get_health_history(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    limit: int = Query(20, ge=1, le=50),
):
    result = await db.execute(
        select(HealthRecord)
        .where(HealthRecord.student_id == student_id)
        .order_by(HealthRecord.record_date.desc())
        .limit(limit)
    )
    records = result.scalars().all()

    return SuccessResponse(data=[
        {
            "id": str(r.id),
            "date": str(r.record_date),
            "event_type": r.event_type.value,
            "affects_attendance": r.affects_attendance,
            "affects_concentration": r.affects_concentration,
            "duration_days": r.duration_days,
            "vision_flag": r.vision_flag,
            "hearing_flag": r.hearing_flag,
            "attention_pattern": r.attention_pattern.value if r.attention_pattern else None,
            "fatigue_level": r.fatigue_level,
            "during_exam_period": r.during_exam_period,
            "notes": r.notes,
        }
        for r in records
    ])


def _compute_health_risk(
    total_absences: int,
    exam_absences: int,
    vision: bool,
    hearing: bool,
    attention: str,
) -> float:
    """Rule-based health risk score (0-100). No LLM."""
    score = 0.0
    if total_absences >= 20:
        score += 35
    elif total_absences >= 10:
        score += 20
    elif total_absences >= 5:
        score += 10

    if exam_absences >= 5:
        score += 25
    elif exam_absences >= 3:
        score += 15
    elif exam_absences >= 1:
        score += 8

    if vision:
        score += 15
    if hearing:
        score += 15
    if attention in ("focus_difficulties", "hyperactive"):
        score += 15
    elif attention in ("frequent_distraction", "anxiety_signs"):
        score += 10
    elif attention == "occasional_fatigue":
        score += 5

    return min(100.0, score)


def _generate_health_flags(
    total: int, exam: int, vision: bool, attention: str
) -> list[str]:
    flags = []
    if total >= 15:
        flags.append(f"⚠️ High medical absence count ({total}) — potential chronic health impact on learning")
    if exam >= 3:
        flags.append(f"⚠️ {exam} absences during exam periods — may significantly impact academic performance")
    if vision:
        flags.append("👁️ Vision concern flagged — consider referral for eye check; may affect reading/board work")
    if attention in ("focus_difficulties", "hyperactive", "anxiety_signs"):
        flags.append(f"🧠 Attention concern: {attention} — teacher should consider seating, task structuring")
    return flags
