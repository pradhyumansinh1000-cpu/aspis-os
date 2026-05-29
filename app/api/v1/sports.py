"""
app/api/v1/sports.py — Sports & Physical Activity API
app/api/v1/health.py — Health Records API
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, require_teacher
from app.database import get_db
from app.models.sports_record import ParticipationLevel, SportsRecord, SportType
from app.schemas.base import SuccessResponse

router = APIRouter(prefix="/sports", tags=["Sports & Physical Activity"])


@router.post(
    "/{student_id}/record",
    response_model=SuccessResponse[dict],
    status_code=status.HTTP_201_CREATED,
    summary="Add sports/physical activity record for a student",
    dependencies=[Depends(require_teacher)],
)
async def add_sports_record(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    sport_name: str = Query(..., description="Name of sport e.g. Cricket, Swimming"),
    academic_year: str = Query(..., description="Academic year e.g. 2024-25"),
    sport_type: SportType = SportType.TEAM,
    participation_level: ParticipationLevel = ParticipationLevel.SCHOOL_TEAM,
    sessions_total: int = Query(0, ge=0),
    sessions_attended: int = Query(0, ge=0),
    is_team_captain: bool = False,
    competition_participated: bool = False,
    competition_result: str | None = None,
    performance_rating: float | None = Query(None, ge=0, le=10),
    fitness_score: float | None = Query(None, ge=0, le=100),
    bmi_category: str | None = None,
    stamina_rating: float | None = Query(None, ge=0, le=10),
    notes: str | None = None,
):
    """
    Record sports participation for a student.
    One record per sport per academic year.
    
    fitness_score is a 0-100 composite from physical fitness tests.
    performance_rating is teacher's assessment of overall sports performance.
    """
    record = SportsRecord(
        student_id=student_id,
        institution_id=current_user.institution_id,
        academic_year=academic_year,
        sport_name=sport_name,
        sport_type=sport_type,
        participation_level=participation_level,
        sessions_total=sessions_total,
        sessions_attended=sessions_attended,
        is_team_captain=is_team_captain,
        competition_participated=competition_participated,
        competition_result=competition_result,
        performance_rating=performance_rating,
        fitness_score=fitness_score,
        bmi_category=bmi_category,
        stamina_rating=stamina_rating,
        shows_leadership_in_sport=is_team_captain,
        notes=notes,
    )
    db.add(record)
    await db.flush()

    # Trigger intelligence profile rebuild
    from app.tasks.intelligence_tasks import build_intelligence_profile
    build_intelligence_profile.delay(str(student_id))

    return SuccessResponse(data={
        "record_id": str(record.id),
        "sport": sport_name,
        "attendance_pct": record.attendance_pct,
        "message": "Sports record added. Intelligence profile rebuild queued.",
    })


@router.get(
    "/{student_id}/profile",
    response_model=SuccessResponse[dict],
    summary="Get sports and physical activity profile",
)
async def get_sports_profile(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Returns the student's complete sports profile.
    Includes all sports, fitness scores, leadership indicators,
    and computed stress resilience score.
    """
    from sqlalchemy import func

    result = await db.execute(
        select(SportsRecord)
        .where(SportsRecord.student_id == student_id)
        .order_by(SportsRecord.academic_year.desc())
    )
    records = result.scalars().all()

    if not records:
        return SuccessResponse(data={
            "student_id": str(student_id),
            "sports": [],
            "fitness_score": None,
            "is_sports_active": False,
            "leadership_in_sport": False,
        })

    total_sessions = sum(r.sessions_total for r in records)
    attended = sum(r.sessions_attended for r in records)

    return SuccessResponse(data={
        "student_id": str(student_id),
        "is_sports_active": len(records) > 0,
        "total_sports": len(records),
        "sports_list": list({r.sport_name for r in records}),
        "leadership_in_sport": any(r.is_team_captain for r in records),
        "competition_participated": any(r.competition_participated for r in records),
        "overall_attendance_pct": round(attended / max(total_sessions, 1) * 100, 1),
        "avg_fitness_score": round(
            sum(r.fitness_score for r in records if r.fitness_score) /
            max(sum(1 for r in records if r.fitness_score), 1), 1
        ),
        "stress_resilience_score": round(
            sum(r.stress_resilience_indicator or 5 for r in records) / len(records), 2
        ),
        "records": [
            {
                "sport": r.sport_name,
                "year": r.academic_year,
                "level": r.participation_level.value,
                "attendance_pct": r.attendance_pct,
                "is_captain": r.is_team_captain,
                "competition_result": r.competition_result,
                "fitness_score": r.fitness_score,
                "performance_rating": r.performance_rating,
            }
            for r in records
        ],
        "ai_insight": _generate_sports_insight(records),
    })


def _generate_sports_insight(records: list) -> str:
    """Rule-based sports insight (no LLM call)."""
    if not records:
        return "No sports participation recorded."

    captains = [r for r in records if r.is_team_captain]
    team_sports = [r for r in records if r.sport_type and r.sport_type.value == "team"]

    if captains:
        return (
            f"Student is a team captain in {captains[0].sport_name}. "
            "Leadership in sports often correlates with stronger academic collaboration and stress management."
        )
    elif team_sports:
        return (
            "Participation in team sports suggests good collaborative ability. "
            "Regular physical activity typically correlates with better stress resilience during exams."
        )
    else:
        return "Individual sports participation shows self-motivation and discipline."
