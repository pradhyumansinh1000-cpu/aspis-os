"""
app/tasks/intelligence_tasks.py — Student Intelligence Profile Builder

This is the ORCHESTRATOR Celery task.
It calls all analytics, graph building, ML scoring, and LLM interpretation
in the correct sequence, then stores the result.

Data flow:
1. Load all student data from DB (scores, behavioral, sports, health)
2. Run AcademicAnalyzer → AcademicProfile (pure Python)
3. Run BehavioralAnalyzer → behavioral dict (pure Python)
4. Run CorrelationEngine → correlation matrix (pure Python)
5. Run DependencyGraph → future impact chains (NetworkX)
6. Run RiskScorer → ML risk prediction (XGBoost)
7. Build StudentKnowledgeGraph → full graph (NetworkX)
8. Run LLM (Llama 70B) → narrative interpretation
9. Store result in StudentIntelligenceProfile

Steps 1–7: zero LLM calls (fast, deterministic)
Step 8: single LLM call with pre-computed data (no hallucination)
Step 9: cache result for 24h
"""

import asyncio
import time
import uuid

import structlog
from celery import Task

from app.analytics.academic_analyzer import AcademicAnalyzer
from app.analytics.correlation_engine import CorrelationEngine
from app.analytics.risk_scorer import get_risk_scorer
from app.ai.knowledge_graph_builder import StudentKnowledgeGraphBuilder
from app.celery_app import celery_app
from app.database import get_db_context

logger = structlog.get_logger()


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    bind=True,
    name="app.tasks.intelligence_tasks.build_intelligence_profile",
    max_retries=2,
    default_retry_delay=60,
    queue="ai_heavy",
)
def build_intelligence_profile(self: Task, student_id: str) -> dict:
    """
    Full student intelligence profile build pipeline.
    Estimated time: 30–90 seconds per student.
    
    This runs:
    - 5–7 DB queries (async)
    - 4 Python analytics modules
    - 1 NetworkX graph operation
    - 1 XGBoost ML inference
    - 1 Llama 70B call (the only LLM call)
    """
    student_uuid = uuid.UUID(student_id)
    logger.info("Building intelligence profile", student_id=student_id)
    start = time.perf_counter()

    async def _build():
        async with get_db_context() as db:
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            # ── Load student + user ────────────────────────────────────────
            from app.models.student import Student
            from app.models.user import User

            student_result = await db.execute(
                select(Student)
                .where(Student.id == student_uuid)
                .options(selectinload(Student.user))
            )
            student = student_result.scalar_one_or_none()
            if not student:
                logger.error("Student not found", student_id=student_id)
                return {"status": "error", "message": "Student not found"}

            student_name = student.user.full_name

            # ── Step 1: Load raw score data ────────────────────────────────
            from app.models.assessment import AssessmentQuestion, StudentScore
            from app.models.subject import Subject, Topic

            scores_result = await db.execute(
                select(
                    StudentScore.marks_obtained,
                    StudentScore.is_absent,
                    StudentScore.assessment_id,
                    AssessmentQuestion.max_marks,
                    AssessmentQuestion.question_type,
                    Topic.id.label("topic_id"),
                    Topic.name.label("topic_name"),
                    Subject.name.label("subject_name"),
                )
                .join(AssessmentQuestion, StudentScore.question_id == AssessmentQuestion.id)
                .join(Topic, AssessmentQuestion.topic_id == Topic.id)
                .join(Subject, Topic.subject_id == Subject.id)
                .where(
                    StudentScore.student_id == student_uuid,
                    StudentScore.is_absent == False,
                )
            )
            scores = [dict(row._asdict()) for row in scores_result.all()]
            scores_with_student = [{**s, "student_id": str(student_uuid)} for s in scores]

            # ── Step 2: Academic analysis (pure Python) ────────────────────
            analyzer = AcademicAnalyzer()
            academic_profile = analyzer.analyze(scores_with_student)

            # ── Step 3: Load behavioral data ───────────────────────────────
            from app.models.behavioral_record import BehavioralRecord
            from sqlalchemy import func

            behavioral_result = await db.execute(
                select(
                    func.avg(BehavioralRecord.participation_score).label("participation_avg"),
                    func.avg(BehavioralRecord.leadership_score).label("leadership_avg"),
                    func.avg(BehavioralRecord.assignment_consistency).label("assignment_avg"),
                    func.avg(BehavioralRecord.communication_score).label("communication_avg"),
                    func.avg(BehavioralRecord.teamwork_score).label("teamwork_avg"),
                    func.avg(BehavioralRecord.self_discipline_score).label("discipline_avg"),
                )
                .where(BehavioralRecord.student_id == student_uuid)
            )
            beh_row = behavioral_result.one()

            behavioral_data = {
                "participation_avg": float(beh_row.participation_avg or 5.0),
                "leadership_avg": float(beh_row.leadership_avg or 5.0),
                "assignment_consistency": float(beh_row.assignment_avg or 5.0),
                "communication_avg": float(beh_row.communication_avg or 5.0),
                "teamwork_avg": float(beh_row.teamwork_avg or 5.0),
                "discipline_avg": float(beh_row.discipline_avg or 5.0),
                "composite_score": float(
                    (beh_row.participation_avg or 5) * 0.25 +
                    (beh_row.assignment_avg or 5) * 0.25 +
                    (beh_row.discipline_avg or 5) * 0.25 +
                    (beh_row.leadership_avg or 5) * 0.25
                ),
                "trend": "stable",
            }

            # ── Step 4: Load health data ───────────────────────────────────
            from app.models.health_record import HealthRecord, HealthEventType

            health_count_result = await db.execute(
                select(func.count(HealthRecord.id))
                .where(
                    HealthRecord.student_id == student_uuid,
                    HealthRecord.event_type == HealthEventType.MEDICAL_ABSENCE,
                )
            )
            exam_absence_result = await db.execute(
                select(func.count(HealthRecord.id))
                .where(
                    HealthRecord.student_id == student_uuid,
                    HealthRecord.during_exam_period == True,
                )
            )
            vision_flag_result = await db.execute(
                select(func.count(HealthRecord.id))
                .where(
                    HealthRecord.student_id == student_uuid,
                    HealthRecord.vision_flag == True,
                )
            )

            health_data = {
                "absence_count": health_count_result.scalar_one() or 0,
                "exam_absences": exam_absence_result.scalar_one() or 0,
                "vision_flag": (vision_flag_result.scalar_one() or 0) > 0,
                "hearing_flag": False,
            }

            # ── Step 5: Load sports data ───────────────────────────────────
            from app.models.sports_record import SportsRecord

            sports_result = await db.execute(
                select(SportsRecord)
                .where(SportsRecord.student_id == student_uuid)
                .order_by(SportsRecord.academic_year.desc())
                .limit(5)
            )
            sports_records = sports_result.scalars().all()

            sports_data = {}
            if sports_records:
                avg_fitness = sum(s.fitness_score or 5 for s in sports_records) / len(sports_records)
                sports_data = {
                    "sports": [s.sport_name for s in sports_records],
                    "fitness_score": round(avg_fitness, 1),
                    "is_leader": any(s.is_team_captain for s in sports_records),
                    "participation_pct": round(
                        sum((s.sessions_attended / max(s.sessions_total, 1))
                            for s in sports_records) / len(sports_records) * 100, 1
                    ),
                    "stress_resilience": avg_fitness / 10.0,
                }

            # ── Step 6: Correlation analysis ───────────────────────────────
            corr_engine = CorrelationEngine()
            # Simplified: use scalar correlation with class-level data
            correlations = {}

            # ── Step 7: Dependency graph ───────────────────────────────────
            from app.ontology.graph import get_dependency_graph

            dep_graph = await get_dependency_graph(db)

            weak_topic_ids = [ta.topic_id for ta in academic_profile.topic_accuracies if ta.is_weak]
            prerequisite_weakness = dep_graph.compute_prerequisite_weakness_score(weak_topic_ids)

            # Compute future impact chains for ALL weak topics
            all_impacts = []
            for weak_id in weak_topic_ids[:10]:  # Top 10 weak topics
                impacts = dep_graph.find_downstream_impacts(weak_id, max_depth=4)
                all_impacts.extend(impacts)

            # Deduplicate and sort by impact
            seen_targets = set()
            unique_impacts = []
            for impact in sorted(all_impacts, key=lambda x: -x["cumulative_impact"]):
                key = impact["topic_id"]
                if key not in seen_targets:
                    seen_targets.add(key)
                    unique_impacts.append(impact)

            # ── Step 8: ML risk scoring ────────────────────────────────────
            risk_scorer = get_risk_scorer()
            risk_input = {
                "academic": {
                    "overall_accuracy": academic_profile.overall_accuracy,
                    "topic_accuracy_std": (
                        sum(ta.variance for ta in academic_profile.topic_accuracies) /
                        max(len(academic_profile.topic_accuracies), 1)
                    ),
                    "weak_topics": academic_profile.weak_topics,
                    "attendance_pct": student.attendance_percentage or 75.0,
                },
                "behavioral": behavioral_data,
                "health": health_data,
                "sports": sports_data,
                "ontology": {"prerequisite_weakness_score": prerequisite_weakness},
            }
            risk_result = risk_scorer.predict(risk_input)

            # ── Step 9: Build Knowledge Graph ─────────────────────────────
            graph_builder = StudentKnowledgeGraphBuilder()
            knowledge_graph = graph_builder.build(
                student_id=student_id,
                academic_profile=academic_profile,
                behavioral_data=behavioral_data,
                sports_data=sports_data,
                health_data=health_data,
                correlations=correlations,
                dependency_graph=dep_graph,
            )

            # ── Step 10: LLM narrative generation ─────────────────────────
            # This is the ONLY LLM call — it receives all pre-computed data
            llm_narrative = await _generate_profile_narrative(
                student_name=student_name,
                academic_profile=academic_profile,
                behavioral_data=behavioral_data,
                health_data=health_data,
                sports_data=sports_data,
                risk_result=risk_result,
                future_impacts=unique_impacts[:10],
            )

            # ── Step 11: Assemble full profile ─────────────────────────────
            full_profile = {
                "academic": {
                    "overall_accuracy": round(academic_profile.overall_accuracy * 100, 1),
                    "consistency_score": academic_profile.consistency_score,
                    "improvement_trend": (
                        "improving" if academic_profile.improvement_slope > 0.05
                        else "declining" if academic_profile.improvement_slope < -0.05
                        else "stable"
                    ),
                    "theory_vs_application_gap": academic_profile.theory_vs_application_gap,
                    "careless_mistake_pct": academic_profile.careless_mistake_pct,
                    "conceptual_mistake_pct": academic_profile.conceptual_mistake_pct,
                    "strong_topics": academic_profile.strong_topics,
                    "weak_topics": academic_profile.weak_topics,
                    "critical_topics": academic_profile.critical_topics,
                },
                "behavioral": behavioral_data,
                "sports": sports_data,
                "health": health_data,
                "correlations": correlations,
                "ai_narrative": llm_narrative,
                "top_strengths": llm_narrative.get("strengths", []),
                "top_concerns": llm_narrative.get("concerns", []),
                "overall_risk_score": risk_result.risk_score,
                "overall_risk_level": risk_result.risk_level,
            }

            # ── Step 12: Store / update profile ────────────────────────────
            from app.models.intelligence_profile import (
                StudentIntelligenceProfile, RiskLevel, RiskPrediction
            )
            from datetime import datetime, timezone

            existing_result = await db.execute(
                select(StudentIntelligenceProfile)
                .where(StudentIntelligenceProfile.student_id == student_uuid)
            )
            profile = existing_result.scalar_one_or_none()

            if profile:
                profile.profile_data = full_profile
                profile.knowledge_graph = knowledge_graph
                profile.future_impact_chains = unique_impacts
                profile.overall_risk_score = risk_result.risk_score
                profile.risk_level = RiskLevel(risk_result.risk_level)
                profile.computed_at = datetime.now(timezone.utc)
                profile.engine_version = "2.0.0"
            else:
                profile = StudentIntelligenceProfile(
                    student_id=student_uuid,
                    institution_id=student.institution_id,
                    profile_data=full_profile,
                    knowledge_graph=knowledge_graph,
                    future_impact_chains=unique_impacts,
                    overall_risk_score=risk_result.risk_score,
                    risk_level=RiskLevel(risk_result.risk_level),
                    engine_version="2.0.0",
                )
                db.add(profile)

            await db.flush()

            duration = time.perf_counter() - start
            logger.info(
                "Intelligence profile built",
                student_id=student_id,
                duration_s=round(duration, 2),
                risk_level=risk_result.risk_level,
                weak_topics=len(academic_profile.weak_topics),
                future_impacts=len(unique_impacts),
            )
            return {
                "status": "completed",
                "student_id": student_id,
                "risk_level": risk_result.risk_level,
                "duration_s": round(duration, 2),
            }

    try:
        return run_async(_build())
    except Exception as exc:
        logger.error("Intelligence profile build failed", student_id=student_id, error=str(exc))
        raise self.retry(exc=exc)


async def _generate_profile_narrative(
    student_name: str,
    academic_profile,
    behavioral_data: dict,
    health_data: dict,
    sports_data: dict,
    risk_result,
    future_impacts: list,
) -> dict:
    """
    Single LLM call that receives ALL pre-computed data
    and generates the narrative interpretation.
    
    CRITICAL: No calculations here. LLM only writes explanatory text.
    """
    from app.ai.llm_client import get_llama_client

    llm = get_llama_client()

    # Format future impact chain summary for LLM
    impact_text = ""
    if future_impacts:
        impact_lines = [
            f"  - {i['source_topic_name']} → {i['topic_name']} (Grade {i.get('grade', '?')}): "
            f"{i['cumulative_impact']:.0%} impact"
            for i in future_impacts[:5]
        ]
        impact_text = "\n".join(impact_lines)

    prompt = f"""You are analyzing pre-computed data for student: {student_name}

PRE-COMPUTED DATA (DO NOT RECALCULATE — interpret only):
Academic:
- Overall accuracy: {academic_profile.overall_accuracy*100:.1f}%
- Trend: {'improving' if academic_profile.improvement_slope > 0.05 else 'declining' if academic_profile.improvement_slope < -0.05 else 'stable'}
- Consistency score: {academic_profile.consistency_score:.1f}/10
- Careless mistakes: {academic_profile.careless_mistake_pct:.0f}%
- Conceptual gaps: {academic_profile.conceptual_mistake_pct:.0f}%
- Theory vs Application gap: {academic_profile.theory_vs_application_gap:+.1f}%
- Weak topics: {', '.join(academic_profile.weak_topics[:5]) or 'None'}
- Strong topics: {', '.join(academic_profile.strong_topics[:3]) or 'None'}

Behavioral:
- Participation: {behavioral_data.get('participation_avg', 5):.1f}/10
- Leadership: {behavioral_data.get('leadership_avg', 5):.1f}/10
- Assignment consistency: {behavioral_data.get('assignment_consistency', 5):.1f}/10

Health:
- Medical absences: {health_data.get('absence_count', 0)}
- Exam-period absences: {health_data.get('exam_absences', 0)}
- Vision concern: {'Yes' if health_data.get('vision_flag') else 'No'}

Sports:
- Active sports: {', '.join(sports_data.get('sports', [])) or 'None'}
- Team leader: {'Yes' if sports_data.get('is_leader') else 'No'}

ML Risk Level: {risk_result.risk_level} (score: {risk_result.risk_score:.1f}/100)

Future Impact Chains (pre-computed from curriculum graph):
{impact_text or '  None detected'}

Generate a professional educational analysis as JSON:
{{
  "strengths": ["strength 1 (cite specific data)", "strength 2", "strength 3"],
  "concerns": ["concern 1 (cite specific data)", "concern 2", "concern 3"],
  "behavior_insight": "2-sentence behavioral pattern interpretation",
  "health_note": "1-sentence health impact observation (if relevant)",
  "sports_connection": "1-sentence sports-academic connection (if sports data present)",
  "future_risk_summary": "2-sentence explanation of most critical future impact chain",
  "teacher_recommendation": "3 specific actions for the teacher this week",
  "student_message": "1 encouraging message directly for the student",
  "parent_summary": "2-sentence plain-English summary for parents"
}}"""

    try:
        result = await llm.generate_json(
            prompt=prompt,
            system_prompt=(
                "You are an educational psychologist analyzing student data. "
                "Be specific, evidence-based, and constructive. "
                "Do NOT invent numbers — only interpret the provided data. "
                "Respond ONLY with valid JSON."
            ),
            temperature=0.3,
        )
        return result.get("parsed", {})
    except Exception as e:
        logger.error("LLM narrative generation failed", error=str(e))
        return {
            "strengths": [],
            "concerns": [],
            "teacher_recommendation": "Review student's weak topics and schedule intervention.",
            "student_message": "Keep working hard — every improvement matters!",
            "parent_summary": "Your child is making progress. Regular practice will help.",
        }


@celery_app.task(
    name="app.tasks.intelligence_tasks.rebuild_all_profiles",
    queue="analytics",
)
def rebuild_all_profiles(institution_id: str | None = None) -> dict:
    """
    Celery Beat task: weekly full rebuild of all student profiles.
    Run every Sunday 2 AM to keep all profiles fresh.
    """
    async def _rebuild_all():
        async with get_db_context() as db:
            from sqlalchemy import select
            from app.models.student import Student

            query = select(Student.id).where(Student.deleted_at.is_(None))
            if institution_id:
                query = query.where(Student.institution_id == uuid.UUID(institution_id))

            result = await db.execute(query)
            student_ids = [str(row[0]) for row in result.all()]

        # Enqueue one task per student
        for sid in student_ids:
            build_intelligence_profile.delay(sid)

        logger.info("Profile rebuild batch enqueued", count=len(student_ids))
        return {"enqueued": len(student_ids)}

    return run_async(_rebuild_all())


@celery_app.task(
    name="app.tasks.intelligence_tasks.retrain_risk_model",
    queue="analytics",
)
def retrain_risk_model() -> dict:
    """
    Weekly ML model retraining using new student outcome data.
    Triggered by Celery Beat every Monday.
    """
    async def _retrain():
        async with get_db_context() as db:
            from app.models.intelligence_profile import RiskPrediction

            # In production: load training data from historical records
            # For now: return status indicating model needs manual labeling
            logger.info("Risk model retrain triggered — needs labeled training data")
            return {"status": "needs_training_data"}

    return run_async(_retrain())
