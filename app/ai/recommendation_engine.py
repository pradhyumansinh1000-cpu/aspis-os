"""
app/ai/recommendation_engine.py — Personalized Study Recommendation Generator

Strategy:
  1. Pull student's top weak topics (sorted by severity)
  2. Consider learning pace (how fast they improve)
  3. Check prerequisite topic chain (fix root causes first)
  4. Use Llama 70B to generate a structured, actionable study plan
  5. Store recommendations with priority ordering

Cost optimization:
  - Cache recommendations per student per week (Redis, TTL=7d)
  - Only regenerate if new scores or new weak topics are added
  - Batch LLM calls: generate all recommendations in one prompt
"""

from typing import Any

import structlog

from app.ai.llm_client import get_llama_client

logger = structlog.get_logger()

RECOMMENDATION_SYSTEM_PROMPT = """You are an expert academic coach specializing in 
personalized learning plans for K-12 students. Your recommendations are specific,
actionable, and prioritized by impact.

Always consider:
- The student's grade level and subject
- The severity and number of weak topics
- Realistic study time (don't overload students)
- Mix of practice, review, and concept reinforcement

Respond ONLY with valid JSON. No markdown."""


class RecommendationEngine:

    def __init__(self):
        self.llm = get_llama_client()

    async def generate_recommendations(
        self,
        student_name: str,
        grade: str,
        subject_name: str,
        weak_topics: list[dict],      # [{topic_name, accuracy_score, severity_score, ai_reasoning}]
        recent_scores: list[dict],    # [{assessment_name, score_percentage, date}]
        previous_recommendations: list[dict] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Generate 3–7 prioritized study recommendations for a student.
        
        Returns list of recommendation dicts ready to insert into DB.
        """
        if not weak_topics:
            return []

        # Build context for LLM
        weak_topics_text = "\n".join([
            f"  {i+1}. {t['topic_name']} — "
            f"{t['accuracy_score']*100:.0f}% accuracy, severity={t['severity_score']:.2f}"
            f"{chr(10) + '     Reason: ' + t['ai_reasoning'] if t.get('ai_reasoning') else ''}"
            for i, t in enumerate(weak_topics[:8])  # Limit to top 8
        ])

        score_trend = ""
        if recent_scores:
            scores_text = ", ".join([
                f"{s['assessment_name']}: {s['score_percentage']:.0f}%"
                for s in recent_scores[-4:]  # Last 4 assessments
            ])
            score_trend = f"\nRecent performance trend: {scores_text}"

        prev_rec_note = ""
        if previous_recommendations:
            prev_topics = [r.get("title", "") for r in previous_recommendations[:3]]
            prev_rec_note = f"\nPrevious recommendations given: {', '.join(prev_topics)}"

        prompt = f"""Generate a personalized study plan for:
- Student: {student_name}
- Grade: {grade}
- Subject: {subject_name}

Weak Areas (sorted by severity):
{weak_topics_text}
{score_trend}
{prev_rec_note}

Create 4–6 specific, actionable recommendations. For each:
- Choose type from: topic_review, practice_problems, video_resource, peer_discussion, teacher_help, revision_schedule
- Give specific study steps (not generic advice)
- Estimate realistic time commitment
- Set priority 1 (most urgent) to 5 (optional enrichment)
- Estimate score improvement percentage if followed diligently

Respond as JSON array:
[
  {{
    "title": "Master Newton's Laws with Derivation Practice",
    "description": "Your confusion with Newton's 3rd law is causing errors in reaction force problems. Spend 45 minutes re-reading the derivation, then attempt 20 practice problems focusing on identifying action-reaction pairs.",
    "recommendation_type": "practice_problems",
    "priority": 1,
    "action_plan": {{
      "steps": [
        "Re-read textbook section 4.2 on Newton's Laws",
        "Solve 10 basic problems without calculator",
        "Attempt 10 application problems from past papers"
      ],
      "resources": ["NCERT Chapter 4", "Khan Academy: Newton's Laws"],
      "estimated_hours": 2.5
    }},
    "expected_score_improvement": 8.5,
    "weak_topic_name": "Newton's Laws"
  }},
  ...
]"""

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=RECOMMENDATION_SYSTEM_PROMPT,
                temperature=0.4,  # Slightly higher temp for creative/varied suggestions
            )
            raw_recommendations = result["parsed"]
            if not isinstance(raw_recommendations, list):
                raw_recommendations = []
        except Exception as e:
            logger.error("Recommendation generation failed", error=str(e))
            return []

        # Validate and normalize output
        normalized = []
        for i, rec in enumerate(raw_recommendations[:7]):  # Max 7
            normalized.append({
                "title": str(rec.get("title", ""))[:500],
                "description": str(rec.get("description", "")),
                "recommendation_type": rec.get("recommendation_type", "topic_review"),
                "priority": int(rec.get("priority", i + 1)),
                "action_plan": rec.get("action_plan", {}),
                "expected_score_improvement": float(rec.get("expected_score_improvement", 0.0)),
                "weak_topic_name": rec.get("weak_topic_name"),
            })

        logger.info(
            "Recommendations generated",
            student=student_name,
            subject=subject_name,
            count=len(normalized),
        )
        return normalized


def get_recommendation_engine() -> RecommendationEngine:
    return RecommendationEngine()
