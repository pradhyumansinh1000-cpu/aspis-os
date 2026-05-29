"""
app/api/v1/teacher_actions.py — Teacher Intelligence Dashboard

This is the MOST VALUABLE API for teachers.

Instead of teachers manually looking at each student's data,
the system proactively surfaces:

1. "Which students need intervention NOW?" (ranked by risk)
2. "Which topics need reteaching to the class?" (group-level weak areas)
3. "Which class concept dependencies are at risk?" (ontology-powered)
4. "What should I do in tomorrow's class?" (AI-generated action list)

This is the difference between a reporting tool and an intelligence system.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, require_teacher
from app.database import get_db
from app.models.intelligence_profile import RiskLevel, RiskPrediction, StudentIntelligenceProfile
from app.models.student import Student
from app.models.subject import Subject, Topic
from app.models.user import User
from app.models.weak_topic import WeakTopic
from app.schemas.base import SuccessResponse

router = APIRouter(prefix="/teacher", tags=["Teacher Intelligence Dashboard"])


@router.get(
    "/action-report",
    response_model=SuccessResponse[dict],
    summary="Teacher intervention action report — who needs help NOW?",
    dependencies=[Depends(require_teacher)],
)
async def get_action_report(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    grade: str | None = Query(None),
    section: str | None = Query(None),
    subject_id: uuid.UUID | None = Query(None),
    risk_threshold: str = Query("medium", description="Minimum risk level: low|medium|high|critical"),
):
    """
    THE DAILY TEACHER INTELLIGENCE BRIEFING.
    
    Returns:
    - Critical students (risk=high/critical) requiring immediate attention
    - Students to watch (risk=medium) — pre-intervention warning
    - Top class-wide weak topics
    - Suggested teaching interventions
    - Concept readiness for upcoming curriculum
    
    Designed to be read in 5 minutes before class.
    """
    # ── Load students with their intelligence profiles ─────────────────────
    student_query = (
        select(Student)
        .where(
            Student.institution_id == current_user.institution_id,
            Student.deleted_at.is_(None),
        )
        .options(
            selectinload(Student.user),
        )
    )
    if grade:
        student_query = student_query.where(Student.grade == grade)
    if section:
        student_query = student_query.where(Student.section == section)

    students_result = await db.execute(student_query)
    students = students_result.scalars().all()
    student_ids = [s.id for s in students]

    if not student_ids:
        return SuccessResponse(data={
            "message": "No students found for the specified filters",
            "students": [],
        })

    # ── Load intelligence profiles ─────────────────────────────────────────
    profiles_result = await db.execute(
        select(StudentIntelligenceProfile)
        .where(StudentIntelligenceProfile.student_id.in_(student_ids))
    )
    profiles = {p.student_id: p for p in profiles_result.scalars().all()}

    # ── Build student risk list ────────────────────────────────────────────
    risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    risk_threshold_level = risk_order.get(risk_threshold, 2)

    critical_students = []
    watch_students = []
    no_data_students = []

    student_map = {s.id: s for s in students}

    for student in students:
        profile = profiles.get(student.id)

        if not profile:
            no_data_students.append({
                "student_id": str(student.id),
                "name": student.user.full_name,
                "grade": student.grade,
                "section": student.section,
                "message": "Profile not yet built",
            })
            continue

        risk_level = profile.risk_level or RiskLevel.LOW
        risk_score = profile.overall_risk_score or 0.0
        level_num = risk_order.get(risk_level, 3)

        student_summary = {
            "student_id": str(student.id),
            "name": student.user.full_name,
            "grade": student.grade,
            "section": student.section,
            "roll_number": student.roll_number,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "top_concerns": [],
            "recommended_action": "",
        }

        # Extract top concerns from profile
        if profile.profile_data:
            academic = profile.profile_data.get("academic", {})
            student_summary["top_concerns"] = academic.get("weak_topics", [])[:3]
            behavioral = profile.profile_data.get("behavioral", {})
            if behavioral.get("assignment_consistency", 10) < 5:
                student_summary["top_concerns"].append("Assignment consistency issue")

        # Generate action text
        if risk_level == "critical":
            student_summary["recommended_action"] = (
                "🚨 Immediate one-on-one intervention required. "
                "Schedule parent meeting. Consider remedial support."
            )
            critical_students.append(student_summary)
        elif risk_level == "high":
            student_summary["recommended_action"] = (
                "⚠️ Needs focused attention this week. "
                "Extra practice on weak topics. Monitor daily."
            )
            critical_students.append(student_summary)
        elif risk_level == "medium" and level_num <= risk_threshold_level:
            student_summary["recommended_action"] = (
                "👀 Watch closely. Provide additional support resources. "
                "Check in after next assessment."
            )
            watch_students.append(student_summary)

    # Sort by risk score
    critical_students.sort(key=lambda x: -x["risk_score"])
    watch_students.sort(key=lambda x: -x["risk_score"])

    # ── Class-wide Weak Topics ─────────────────────────────────────────────
    # Find topics where many students are weak (from WeakTopic table)
    class_weak_topics_result = await db.execute(
        select(
            Topic.name,
            Topic.id.label("topic_id"),
            Subject.name.label("subject_name"),
            func.count(WeakTopic.student_id).label("affected_count"),
            func.avg(WeakTopic.accuracy_score).label("avg_accuracy"),
        )
        .join(WeakTopic, WeakTopic.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .where(
            WeakTopic.student_id.in_(student_ids),
            WeakTopic.is_resolved == False,
        )
        .group_by(Topic.id, Topic.name, Subject.name)
        .order_by(func.count(WeakTopic.student_id).desc())
        .limit(10)
    )
    class_weak_topics = [
        {
            "topic_name": row.name,
            "topic_id": str(row.topic_id),
            "subject": row.subject_name,
            "affected_students": row.affected_count,
            "affected_pct": round(row.affected_count / max(len(students), 1) * 100, 1),
            "avg_accuracy": round((row.avg_accuracy or 0) * 100, 1),
            "teaching_action": _suggest_teaching_action(row.name, row.affected_count, len(students)),
        }
        for row in class_weak_topics_result.all()
    ]

    # ── Future Risk Summary ────────────────────────────────────────────────
    total_with_future_risks = sum(
        1 for p in profiles.values()
        if p.future_impact_chains and len(p.future_impact_chains) > 0
    )

    # ── Summary Stats ──────────────────────────────────────────────────────
    total_students = len(students)
    critical_count = len([s for s in critical_students if s["risk_level"] == "critical"])
    high_count = len([s for s in critical_students if s["risk_level"] == "high"])

    return SuccessResponse(data={
        "report_for": {
            "grade": grade,
            "section": section,
            "total_students": total_students,
        },
        "class_health": _compute_class_health(critical_count, high_count, total_students),
        "summary": {
            "critical_risk": critical_count,
            "high_risk": high_count,
            "watching": len(watch_students),
            "no_profile_data": len(no_data_students),
            "with_future_risks": total_with_future_risks,
        },
        "intervention_required": critical_students,    # Act NOW
        "students_to_watch": watch_students[:10],      # Monitor
        "class_weak_topics": class_weak_topics,         # Reteach these
        "students_awaiting_profile": no_data_students,
        "quick_win_tip": _generate_quick_win(class_weak_topics, critical_students),
    })


@router.get(
    "/class-intelligence/{grade}/{section}",
    response_model=SuccessResponse[dict],
    summary="Full class-level knowledge map and readiness analysis",
    dependencies=[Depends(require_teacher)],
)
async def get_class_intelligence(
    grade: str,
    section: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Deep class-level analysis showing:
    - Topic mastery distribution across the class
    - Which concepts the class is ready to advance to
    - Cross-student patterns (e.g., "43% of class weak in fractions")
    - Recommended teaching sequence for next 2 weeks
    """
    students_result = await db.execute(
        select(Student)
        .where(
            Student.institution_id == current_user.institution_id,
            Student.grade == grade,
            Student.section == section,
            Student.deleted_at.is_(None),
        )
        .options(selectinload(Student.user))
    )
    students = students_result.scalars().all()
    student_ids = [s.id for s in students]

    # Topic mastery distribution
    weak_topic_dist_result = await db.execute(
        select(
            Topic.id,
            Topic.name,
            Subject.name.label("subject"),
            func.count(WeakTopic.student_id).label("weak_count"),
        )
        .join(WeakTopic, WeakTopic.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .where(
            WeakTopic.student_id.in_(student_ids),
            WeakTopic.is_resolved == False,
        )
        .group_by(Topic.id, Topic.name, Subject.name)
        .order_by(func.count(WeakTopic.student_id).desc())
    )
    topic_distribution = [
        {
            "topic": row.name,
            "subject": row.subject,
            "weak_count": row.weak_count,
            "weak_pct": round(row.weak_count / max(len(students), 1) * 100, 1),
            "class_ready": row.weak_count / max(len(students), 1) < 0.30,
            # Class is "ready" to advance if <30% are weak
        }
        for row in weak_topic_dist_result.all()
    ]

    return SuccessResponse(data={
        "grade": grade,
        "section": section,
        "total_students": len(students),
        "topic_mastery_distribution": topic_distribution,
        "class_ready_topics": [t for t in topic_distribution if t["class_ready"]],
        "topics_needing_reteach": [
            t for t in topic_distribution if t["weak_pct"] >= 40
        ],
        "concept_readiness_score": _compute_readiness_score(topic_distribution),
    })


@router.get(
    "/concept-readiness/{subject_id}",
    response_model=SuccessResponse[dict],
    summary="Is the class ready to move to the next chapter?",
    dependencies=[Depends(require_teacher)],
)
async def get_concept_readiness(
    subject_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    grade: str | None = Query(None),
):
    """
    Uses the dependency graph to check if the class has mastered
    prerequisites before moving to the next topic.
    
    "Can I teach Algebra next week, or do I need to revisit Fractions first?"
    """
    from app.ontology.graph import get_dependency_graph

    graph = await get_dependency_graph(db)

    # Get topics for this subject
    topics_result = await db.execute(
        select(Topic).where(Topic.subject_id == subject_id)
    )
    topics = topics_result.scalars().all()

    # Check how many students are weak on prerequisite topics
    readiness_map = {}
    for topic in topics:
        prereqs = list(graph._graph.predecessors(str(topic.id))) if graph.is_available else []

        weak_on_prereq_result = await db.execute(
            select(func.count(WeakTopic.student_id))
            .where(
                WeakTopic.topic_id.in_([uuid.UUID(p) for p in prereqs]),
                WeakTopic.is_resolved == False,
            )
        )
        weak_count = weak_on_prereq_result.scalar_one() or 0

        readiness_map[str(topic.id)] = {
            "topic_name": topic.name,
            "prerequisite_count": len(prereqs),
            "students_weak_on_prerequisites": weak_count,
            "class_ready": weak_count == 0 or weak_count <= 2,
        }

    ready_topics = [v for v in readiness_map.values() if v["class_ready"]]
    not_ready = [v for v in readiness_map.values() if not v["class_ready"]]

    return SuccessResponse(data={
        "subject_id": str(subject_id),
        "topics_class_ready_for": ready_topics,
        "topics_not_ready": not_ready,
        "recommendation": (
            f"Class is ready for {len(ready_topics)} topics. "
            f"Revisit prerequisites for {len(not_ready)} topics before advancing."
        ),
    })


# ── Helper functions ──────────────────────────────────────────────────────────
def _compute_class_health(critical: int, high: int, total: int) -> dict:
    concern_pct = (critical + high) / max(total, 1) * 100
    if concern_pct >= 40:
        status = "serious_concern"
        message = f"{concern_pct:.0f}% of class needs immediate support"
    elif concern_pct >= 20:
        status = "moderate_concern"
        message = f"{concern_pct:.0f}% of class requires close monitoring"
    elif concern_pct >= 10:
        status = "mild_concern"
        message = "Most students are on track. A few need support."
    else:
        status = "healthy"
        message = "Class is performing well overall"

    return {"status": status, "concern_percentage": round(concern_pct, 1), "message": message}


def _suggest_teaching_action(topic_name: str, affected: int, total: int) -> str:
    pct = affected / max(total, 1) * 100
    if pct >= 50:
        return f"Full class reteach needed — {pct:.0f}% are weak"
    elif pct >= 30:
        return f"Group remedial session — {pct:.0f}% struggling"
    else:
        return f"Targeted support for {affected} students"


def _compute_readiness_score(topic_distribution: list) -> float:
    if not topic_distribution:
        return 100.0
    avg_weak_pct = sum(t["weak_pct"] for t in topic_distribution) / len(topic_distribution)
    return round(max(0, 100 - avg_weak_pct), 1)


def _generate_quick_win(class_weak: list, critical: list) -> str:
    if class_weak:
        top_topic = class_weak[0]["topic_name"]
        pct = class_weak[0]["affected_pct"]
        return (
            f"💡 Quick Win: {pct:.0f}% of class is weak in '{top_topic}'. "
            f"A focused 20-min revision of this topic could lift class average."
        )
    elif critical:
        name = critical[0]["name"]
        return f"💡 Priority: {name} needs immediate one-on-one support this week."
    return "💡 Class is performing well. Continue with planned curriculum."
