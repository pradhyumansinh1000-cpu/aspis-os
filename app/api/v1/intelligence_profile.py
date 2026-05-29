"""
app/api/v1/intelligence_profile.py — Student Digital Intelligence Profile API

This is the flagship API of the system. It returns a comprehensive, 
multi-domain analysis of a student — not just marks.

The profile is:
  1. Pre-computed by a Celery task (async, heavy)
  2. Cached in StudentIntelligenceProfile table
  3. Returned instantly via this API (no realtime computation)

Rebuild triggers:
  - New assessment scores entered
  - New behavioral records added
  - Student health/sports records updated
  - Weekly Celery Beat task (keeps all profiles fresh)
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, require_roles, require_teacher
from app.core.exceptions import NotFoundError
from app.database import get_db
from app.models.intelligence_profile import StudentIntelligenceProfile
from app.models.student import Student
from app.models.user import UserRole
from app.redis_client import RedisCache, get_redis
from app.schemas.base import MessageResponse, SuccessResponse

router = APIRouter(prefix="/profile", tags=["Student Digital Intelligence Profile"])


@router.get(
    "/{student_id}",
    response_model=SuccessResponse[dict],
    summary="Get full Student Digital Intelligence Profile",
)
async def get_intelligence_profile(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
):
    """
    Returns the complete multi-domain intelligence profile for a student.
    
    Includes:
    - Academic: topic mastery map, mistake classification, consistency, trend
    - Behavioral: participation, leadership, assignment consistency, learning style
    - Sports: active sports, fitness score, leadership, stress resilience
    - Health: absence patterns, vision/hearing flags, concentration patterns
    - Cross-domain correlations (statistically computed)
    - Overall risk score (XGBoost ML model output)
    - Top strengths and concerns
    
    If profile is stale (>24h), a rebuild is triggered in the background.
    The stale version is still returned immediately — never blocks the client.
    """
    result = await db.execute(
        select(StudentIntelligenceProfile)
        .where(StudentIntelligenceProfile.student_id == student_id)
        .options(selectinload(StudentIntelligenceProfile.student))
    )
    profile = result.scalar_one_or_none()

    if not profile:
        # Profile doesn't exist yet — trigger build and return 202
        from app.tasks.intelligence_tasks import build_intelligence_profile
        build_intelligence_profile.delay(str(student_id))
        return SuccessResponse(data={
            "student_id": str(student_id),
            "status": "building",
            "message": "Profile is being built. Check back in 30–60 seconds.",
            "profile_data": None,
        })

    # Trigger background rebuild if stale (non-blocking)
    if profile.is_stale(max_age_hours=24):
        from app.tasks.intelligence_tasks import build_intelligence_profile
        background_tasks.add_task(
            lambda: build_intelligence_profile.delay(str(student_id))
        )

    return SuccessResponse(data={
        "student_id": str(student_id),
        "status": "ready",
        "computed_at": profile.computed_at.isoformat(),
        "is_stale": profile.is_stale(),
        "overall_risk_level": profile.risk_level,
        "overall_risk_score": profile.overall_risk_score,
        "profile_data": profile.profile_data,
        "knowledge_graph_summary": (
            profile.knowledge_graph.get("summary") if profile.knowledge_graph else None
        ),
        "engine_version": profile.engine_version,
    })


@router.get(
    "/{student_id}/knowledge-graph",
    response_model=SuccessResponse[dict],
    summary="Get student knowledge graph (nodes and edges)",
)
async def get_knowledge_graph(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Returns the full knowledge graph for visualization.
    
    Graph nodes represent: topics, skills, behaviors, health indicators.
    Graph edges represent: dependencies, correlations, risk cascades.
    
    Use this to render a D3.js or Cytoscape.js visualization on the frontend.
    """
    result = await db.execute(
        select(StudentIntelligenceProfile)
        .where(StudentIntelligenceProfile.student_id == student_id)
    )
    profile = result.scalar_one_or_none()

    if not profile or not profile.knowledge_graph:
        raise NotFoundError("Knowledge Graph", str(student_id))

    return SuccessResponse(data=profile.knowledge_graph)


@router.get(
    "/{student_id}/future-risks",
    response_model=SuccessResponse[dict],
    summary="Get predicted future academic risks based on dependency graph",
)
async def get_future_risks(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    min_impact: float = Query(0.4, ge=0.0, le=1.0, description="Minimum impact score to include"),
):
    """
    THE MOST POWERFUL FEATURE.
    
    Shows which future topics/grades will be impacted by current weaknesses.
    
    Example response:
    {
      "current_weak_topics": ["Fractions (Grade 6)", "Ratios (Grade 6)"],
      "future_impact_chains": [
        {
          "from": "Fractions",
          "to": "Algebra (Grade 8)",
          "impact_score": 0.87,
          "grade_gap": 2,
          "path": "Fractions → Ratios → Linear Equations → Algebra",
          "urgency": "high"
        },
        {
          "from": "Fractions → Algebra",
          "to": "Physics Numericals (Grade 11)",
          "impact_score": 0.70,
          "grade_gap": 5,
          "cross_subject": true,
          "urgency": "medium"
        }
      ],
      "root_cause_topics": ["Fractions"],
      "recommendation_priority": "Fix Fractions FIRST — it is causing 3 downstream risks"
    }
    """
    result = await db.execute(
        select(StudentIntelligenceProfile)
        .where(StudentIntelligenceProfile.student_id == student_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise NotFoundError("Intelligence Profile", str(student_id))

    future_chains = profile.future_impact_chains or []
    filtered = [c for c in future_chains if c.get("cumulative_impact", 0) >= min_impact]

    # Group by urgency
    high_urgency = [c for c in filtered if c.get("grade_gap", 99) <= 1]
    medium_urgency = [c for c in filtered if 1 < c.get("grade_gap", 99) <= 3]
    long_term = [c for c in filtered if c.get("grade_gap", 99) > 3]

    academic_data = profile.profile_data.get("academic", {}) if profile.profile_data else {}
    weak_topics = academic_data.get("weak_topics", [])

    return SuccessResponse(data={
        "student_id": str(student_id),
        "current_weak_topics": weak_topics,
        "future_impact_chains": filtered,
        "urgency_breakdown": {
            "immediate": len(high_urgency),     # Same/next grade
            "medium_term": len(medium_urgency), # 2–3 grades away
            "long_term": len(long_term),         # 4+ grades away
        },
        "high_urgency_chains": high_urgency[:5],
        "total_future_topics_at_risk": len(set(
            c.get("target_topic_id") for c in filtered
        )),
        "most_impactful_root_cause": (
            filtered[0].get("source_topic_name") if filtered else None
        ),
    })


@router.post(
    "/{student_id}/rebuild",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Force rebuild of student intelligence profile",
    dependencies=[Depends(require_teacher)],
)
async def rebuild_profile(
    student_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Triggers an immediate full profile rebuild via Celery.
    Returns 202 immediately. Profile will be ready in 30–120 seconds.
    """
    from app.tasks.intelligence_tasks import build_intelligence_profile
    task = build_intelligence_profile.delay(str(student_id))

    return MessageResponse(
        message=f"Profile rebuild queued (task_id={task.id}). Ready in ~60 seconds."
    )


# ─── Ontology Endpoints ───────────────────────────────────────────────────────
@router.get(
    "/ontology/topic/{topic_id}/impact-chain",
    response_model=SuccessResponse[dict],
    summary="Get the full future impact chain for a topic",
)
async def get_topic_impact_chain(
    topic_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """
    Shows what future topics depend on mastery of this topic.
    Teacher can use this to explain WHY a topic matters.
    
    "If students don't master Fractions today, here is what will break later..."
    """
    from app.ontology.graph import get_dependency_graph

    graph = await get_dependency_graph(db)
    impacts = graph.find_downstream_impacts(str(topic_id), max_depth=5)

    return SuccessResponse(data={
        "topic_id": str(topic_id),
        "downstream_impacts": impacts,
        "total_affected_topics": len(impacts),
        "cross_subject_impacts": [i for i in impacts if i.get("is_cross_subject")],
    })


@router.post(
    "/ontology/seed",
    response_model=SuccessResponse[dict],
    summary="Seed CBSE curriculum dependency data",
    dependencies=[Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))],
)
async def seed_ontology(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """Seed the curriculum ontology with CBSE dependency data. Run once on setup."""
    from app.ontology.seed_curriculum import seed_curriculum_dependencies
    from app.ontology.graph import invalidate_graph_cache

    result = await seed_curriculum_dependencies(db)
    invalidate_graph_cache()  # Reload graph on next request

    return SuccessResponse(data={
        "status": "seeded",
        **result,
        "message": "Curriculum dependencies loaded. Knowledge graph is now active.",
    })
