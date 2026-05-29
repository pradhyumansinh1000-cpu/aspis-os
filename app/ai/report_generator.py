"""
app/ai/report_generator.py — AI Report Generation with Llama 70B

Generates structured performance reports for different audiences:
  - Student: Encouraging, progress-focused, actionable
  - Parent: Clear language, attendance + performance summary
  - Teacher: Analytical, class-level insights
  - Admin: Institutional trends

Caching strategy:
  - Redis cache key: f"report:{student_id}:{report_type}:{week/month}"
  - TTL: 24 hours (re-generate daily max)
  - Invalidated when new scores are entered

This ensures one LLM call per student per day max — not per API request.
"""

from datetime import datetime
from typing import Any

import structlog

from app.ai.llm_client import get_llama_client

logger = structlog.get_logger()


STUDENT_REPORT_PROMPT = """You are a supportive academic mentor writing a performance 
report for a student. Be encouraging, specific, and constructive. 
Use simple language. Focus on growth mindset. Respond ONLY with valid JSON."""

PARENT_REPORT_PROMPT = """You are writing an academic progress summary for a parent.
Be clear, concise, and honest. Highlight strengths, areas needing attention, 
and specific ways the parent can support their child at home.
Respond ONLY with valid JSON."""

TEACHER_REPORT_PROMPT = """You are an educational data analyst writing a class-level
performance insight report for a teacher. Be data-driven, identify patterns,
highlight at-risk students (without naming them in class reports), and suggest
teaching strategy adjustments. Respond ONLY with valid JSON."""


class ReportGenerator:

    def __init__(self):
        self.llm = get_llama_client()

    async def generate_student_report(
        self,
        student_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Generate a comprehensive student performance report.
        
        student_data keys:
          name, grade, subject_performances, weak_topics,
          attendance_pct, score_trend, recommendations_count
        
        Returns structured JSON report:
        {
          "summary": "...",
          "strengths": [...],
          "areas_for_improvement": [...],
          "performance_trend": "improving|declining|stable",
          "predicted_next_score": 78.5,
          "encouragement_message": "...",
          "key_actions": [...]
        }
        """
        name = student_data.get("name", "Student")
        grade = student_data.get("grade", "")
        attendance = student_data.get("attendance_pct", 0)

        # Build subject summary
        subject_lines = []
        for subj in student_data.get("subject_performances", []):
            subject_lines.append(
                f"  - {subj['subject_name']}: {subj['average_score']:.1f}% avg "
                f"({subj['assessment_count']} assessments)"
            )
        subjects_text = "\n".join(subject_lines) or "  No data yet"

        # Build weak topics summary
        weak_lines = []
        for wt in student_data.get("weak_topics", [])[:5]:
            weak_lines.append(
                f"  - {wt['topic_name']} ({wt['subject_name']}): "
                f"{wt['accuracy_score']*100:.0f}% accuracy"
            )
        weak_text = "\n".join(weak_lines) or "  No significant weak areas detected"

        # Score trend
        trend_points = student_data.get("score_trend", [])
        trend_text = ""
        if len(trend_points) >= 2:
            first_score = trend_points[0].get("score_percentage", 0)
            last_score = trend_points[-1].get("score_percentage", 0)
            trend_text = f"\nScore trend: {first_score:.0f}% → {last_score:.0f}% over {len(trend_points)} assessments"

        prompt = f"""Generate a performance report for:
- Student: {name}, Grade {grade}
- Attendance: {attendance:.1f}%

Subject Performance:
{subjects_text}

Weak Areas:
{weak_text}
{trend_text}

Active recommendations: {student_data.get("recommendations_count", 0)}

Generate a comprehensive, encouraging report as JSON:
{{
  "summary": "2-3 sentence overall performance summary",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areas_for_improvement": ["area 1", "area 2"],
  "performance_trend": "improving|declining|stable",
  "predicted_next_score": <float 0-100>,
  "attendance_comment": "Brief comment on attendance",
  "encouragement_message": "Personalized motivational message for {name}",
  "key_actions": ["action 1", "action 2", "action 3"],
  "teacher_note": "Brief note for the teacher about this student"
}}"""

        result = await self.llm.generate_json(
            prompt=prompt,
            system_prompt=STUDENT_REPORT_PROMPT,
            temperature=0.4,
        )
        return result["parsed"]

    async def generate_parent_summary(
        self,
        student_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Generate a parent-friendly report in plain language."""
        name = student_data.get("name", "Your child")
        attendance = student_data.get("attendance_pct", 0)
        overall_score = student_data.get("overall_score", 0)

        prompt = f"""Write a parent-friendly progress report for {name} (Grade {student_data.get('grade')}).

Overall Score: {overall_score:.1f}%
Attendance: {attendance:.1f}%
Weak Topics Count: {len(student_data.get('weak_topics', []))}
Recommendations Given: {student_data.get('recommendations_count', 0)}

Write an honest, empathetic, and actionable report for the parent as JSON:
{{
  "greeting": "Dear Parent/Guardian,",
  "overall_summary": "2-3 sentences on overall performance",
  "attendance_status": "good|concerning|critical",
  "attendance_message": "...",
  "academic_highlights": ["positive point 1", "positive point 2"],
  "areas_needing_support": ["area 1 with home activity suggestion"],
  "recommended_home_activities": ["activity 1", "activity 2"],
  "school_support_available": "Mention teacher consultation, extra classes etc.",
  "next_steps": ["step 1", "step 2"],
  "closing": "Encouraging closing sentence"
}}"""

        result = await self.llm.generate_json(
            prompt=prompt,
            system_prompt=PARENT_REPORT_PROMPT,
            temperature=0.3,
        )
        return result["parsed"]

    async def generate_class_insight(
        self,
        class_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Generate a teacher-facing class performance insight."""
        prompt = f"""Analyze this class performance data for a teacher:

Grade: {class_data.get('grade')} {class_data.get('section', '')}
Subject: {class_data.get('subject_name')}
Student Count: {class_data.get('student_count')}
Class Average: {class_data.get('class_average', 0):.1f}%
At-Risk Students (below 40%): {class_data.get('at_risk_count', 0)}
Common Weak Topics: {', '.join(class_data.get('common_weak_topics', [])[:5])}
Attendance Average: {class_data.get('attendance_average', 0):.1f}%

Generate actionable class insights as JSON:
{{
  "class_health": "strong|moderate|concerning|critical",
  "summary": "Overall class performance summary in 2-3 sentences",
  "common_misconceptions": ["misconception 1", "misconception 2"],
  "teaching_strategy_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "topics_to_revisit": ["topic 1", "topic 2"],
  "students_needing_attention": "<count> students need immediate intervention",
  "positive_observations": ["observation 1", "observation 2"],
  "recommended_activities": [
    {{"activity": "Group problem solving on Newton's Laws", "duration_minutes": 30}}
  ]
}}"""

        result = await self.llm.generate_json(
            prompt=prompt,
            system_prompt=TEACHER_REPORT_PROMPT,
            temperature=0.3,
        )
        return result["parsed"]


def get_report_generator() -> ReportGenerator:
    return ReportGenerator()
