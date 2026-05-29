"""
app/ai/weak_topic_detector.py — AI-Powered Weak Topic Detection

Algorithm:
  1. Aggregate all StudentScore records per topic
  2. Calculate accuracy = total_marks_obtained / total_max_marks per topic
  3. Apply threshold: accuracy < 0.60 → weak topic
  4. Severity = (0.60 - accuracy) / 0.60 (normalized 0→1)
  5. Send weak topics to Llama 70B for reasoning explanation
  6. Upsert WeakTopic records in DB

Why separate severity from accuracy?
  - A student at 55% (barely weak) needs different intervention than 20% (critical)
  - Severity drives recommendation priority
"""

from typing import Any
from uuid import UUID

import structlog

from app.ai.llm_client import get_llama_client

logger = structlog.get_logger()

WEAK_THRESHOLD = 0.60       # Below 60% accuracy = weak
MIN_DATA_POINTS = 2         # Need at least 2 assessments for reliable detection
MAX_TOPICS_FOR_LLM = 10     # Batch limit for LLM reasoning calls


WEAK_TOPIC_SYSTEM_PROMPT = """You are an expert educational analyst. 
You are given a student's performance data showing weak topics (areas where they score below 60%).
Your job is to provide a concise, actionable explanation of WHY the student might be struggling
with each topic, based on common learning patterns and topic relationships.

Be empathetic, constructive, and specific. Avoid generic advice.
Respond with JSON only."""


class WeakTopicDetector:

    def __init__(self):
        self.llm = get_llama_client()

    def compute_topic_accuracies(
        self,
        scores: list[dict],  # [{"topic_id", "topic_name", "marks_obtained", "max_marks"}]
    ) -> dict[str, dict]:
        """
        Aggregate per-question scores into per-topic accuracy.
        
        Returns: {topic_id: {"name": str, "accuracy": float, "data_points": int}}
        """
        topic_totals: dict[str, dict] = {}

        for score in scores:
            topic_id = str(score.get("topic_id", ""))
            if not topic_id:
                continue

            if topic_id not in topic_totals:
                topic_totals[topic_id] = {
                    "name": score.get("topic_name", "Unknown"),
                    "total_obtained": 0.0,
                    "total_max": 0.0,
                    "data_points": 0,
                }

            topic_totals[topic_id]["total_obtained"] += float(score["marks_obtained"])
            topic_totals[topic_id]["total_max"] += float(score["max_marks"])
            topic_totals[topic_id]["data_points"] += 1

        # Compute accuracy
        accuracies = {}
        for topic_id, data in topic_totals.items():
            if data["total_max"] > 0:
                accuracy = data["total_obtained"] / data["total_max"]
                accuracies[topic_id] = {
                    "name": data["name"],
                    "accuracy": accuracy,
                    "data_points": data["data_points"],
                }

        return accuracies

    def identify_weak_topics(
        self, topic_accuracies: dict[str, dict]
    ) -> list[dict[str, Any]]:
        """
        Filter topics below WEAK_THRESHOLD with sufficient data points.
        Compute severity score for each weak topic.
        Sort by severity (most critical first).
        """
        weak_topics = []

        for topic_id, data in topic_accuracies.items():
            # Skip topics with insufficient data
            if data["data_points"] < MIN_DATA_POINTS:
                continue

            accuracy = data["accuracy"]
            if accuracy < WEAK_THRESHOLD:
                # Severity: how far below threshold (normalized 0→1)
                severity = (WEAK_THRESHOLD - accuracy) / WEAK_THRESHOLD
                severity = round(min(1.0, severity), 4)

                weak_topics.append({
                    "topic_id": topic_id,
                    "topic_name": data["name"],
                    "accuracy_score": round(accuracy, 4),
                    "severity_score": severity,
                    "data_points": data["data_points"],
                })

        # Sort: most severe first
        weak_topics.sort(key=lambda x: x["severity_score"], reverse=True)
        return weak_topics

    async def generate_reasoning(
        self,
        student_name: str,
        subject_name: str,
        weak_topics: list[dict],
    ) -> dict[str, str]:
        """
        Use Llama 70B to generate per-topic explanations.
        
        Returns: {topic_id: "reasoning text"}
        
        We batch all topics in one LLM call to reduce inference overhead.
        """
        if not weak_topics:
            return {}

        # Limit topics sent to LLM (cost/speed control)
        topics_for_llm = weak_topics[:MAX_TOPICS_FOR_LLM]

        topics_text = "\n".join([
            f"- {t['topic_name']}: {t['accuracy_score']*100:.1f}% accuracy "
            f"(severity: {t['severity_score']:.2f})"
            for t in topics_for_llm
        ])

        prompt = f"""Student: {student_name}
Subject: {subject_name}

The student consistently struggles with these topics (scored below 60%):
{topics_text}

For each topic, provide:
1. Likely root cause of struggle (2-3 sentences)
2. Whether it's a prerequisite issue (needs earlier topic review)

Respond as JSON:
{{
  "topic_name_1": {{
    "root_cause": "...",
    "is_prerequisite_issue": true/false,
    "prerequisite_topics": ["topic1", "topic2"]
  }},
  ...
}}"""

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=WEAK_TOPIC_SYSTEM_PROMPT,
                temperature=0.2,
            )
            reasoning_data = result["parsed"]
        except Exception as e:
            logger.warning("LLM reasoning generation failed", error=str(e))
            reasoning_data = {}

        # Map topic names back to topic IDs
        topic_name_to_id = {t["topic_name"]: t["topic_id"] for t in topics_for_llm}
        result_map = {}
        for topic_name, reasoning in reasoning_data.items():
            topic_id = topic_name_to_id.get(topic_name)
            if topic_id:
                root_cause = reasoning.get("root_cause", "")
                prereq = reasoning.get("is_prerequisite_issue", False)
                prereq_topics = ", ".join(reasoning.get("prerequisite_topics", []))
                
                full_reasoning = root_cause
                if prereq and prereq_topics:
                    full_reasoning += f" Review prerequisite topics first: {prereq_topics}."
                
                result_map[topic_id] = full_reasoning

        return result_map

    async def detect_and_explain(
        self,
        student_name: str,
        subject_name: str,
        scores: list[dict],
    ) -> list[dict[str, Any]]:
        """
        Full pipeline: raw scores → weak topics with AI explanations.
        
        Returns list of weak topic dicts with reasoning, ready to upsert into DB.
        """
        topic_accuracies = self.compute_topic_accuracies(scores)
        weak_topics = self.identify_weak_topics(topic_accuracies)

        if not weak_topics:
            logger.info(f"No weak topics detected for {student_name} in {subject_name}")
            return []

        reasoning_map = await self.generate_reasoning(
            student_name=student_name,
            subject_name=subject_name,
            weak_topics=weak_topics,
        )

        for topic in weak_topics:
            topic["ai_reasoning"] = reasoning_map.get(topic["topic_id"])

        logger.info(
            "Weak topic detection complete",
            student=student_name,
            subject=subject_name,
            weak_count=len(weak_topics),
        )
        return weak_topics


def get_weak_topic_detector() -> WeakTopicDetector:
    return WeakTopicDetector()
