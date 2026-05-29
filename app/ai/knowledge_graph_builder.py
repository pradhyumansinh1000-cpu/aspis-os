"""
app/ai/knowledge_graph_builder.py — Student Knowledge Graph

Builds a per-student NetworkX graph combining ALL domains:
  - Academic mastery per topic (from scores)
  - Behavioral profile nodes (participation, leadership)
  - Health indicators (absence pattern, focus)
  - Sports profile (fitness, resilience)
  - Dependency edges (from curriculum ontology)

The student graph is then:
  1. Stored as JSONB in StudentIntelligenceProfile
  2. Queried for the intelligence profile API
  3. Used by LLM to understand the WHOLE student (not just marks)

Node types:
  topic: {mastery, is_weak, mistake_type}
  skill: {level, domain}
  behavior: {score, trend}
  health: {severity, impact}
  risk: {level, confidence}

Edge types:
  mastery_supports: student mastered A → easier to learn B
  at_risk: weakness in A → B is at risk
  correlates: A and B scores correlate (statistical)
"""

from typing import Any

import structlog

from app.analytics.academic_analyzer import AcademicAnalyzer, AcademicProfile
from app.ontology.graph import DependencyGraph

logger = structlog.get_logger()


class StudentKnowledgeGraphBuilder:
    """
    Builds the per-student knowledge graph combining all data domains.
    """

    def build(
        self,
        student_id: str,
        academic_profile: AcademicProfile,
        behavioral_data: dict,
        sports_data: dict,
        health_data: dict,
        correlations: dict,
        dependency_graph: DependencyGraph,
    ) -> dict[str, Any]:
        """
        Returns a serializable graph dict:
        {
          "nodes": [
            {"id": "topic_uuid", "type": "topic", "label": "Fractions",
             "mastery": 0.42, "is_weak": true, "mistake_type": "conceptual",
             "grade": "6", "subject": "Mathematics"},
            {"id": "behavior_participation", "type": "behavior",
             "label": "Class Participation", "score": 7.2, "trend": "stable"},
            ...
          ],
          "edges": [
            {"source": "topic_A_uuid", "target": "topic_B_uuid",
             "type": "at_risk", "strength": 0.87, "label": "Weakness cascades"},
            ...
          ],
          "summary": {
            "total_topics": 24,
            "mastered_topics": 15,
            "weak_topics": 6,
            "critical_topics": 3,
            "overall_health": "moderate_concern"
          }
        }
        """
        nodes = []
        edges = []

        # ── Topic Nodes ───────────────────────────────────────────────────────
        topic_node_ids = set()
        for ta in academic_profile.topic_accuracies:
            node_id = f"topic_{ta.topic_id}"
            topic_node_ids.add(node_id)

            mastery_label = (
                "critical" if ta.accuracy < 0.40 else
                "weak" if ta.accuracy < 0.60 else
                "developing" if ta.accuracy < 0.80 else
                "strong"
            )

            nodes.append({
                "id": node_id,
                "type": "topic",
                "label": ta.topic_name,
                "mastery": ta.accuracy,
                "mastery_label": mastery_label,
                "is_weak": ta.is_weak,
                "mistake_type": ta.mistake_type,
                "severity": ta.severity,
                "data_points": ta.data_points,
                "variance": ta.variance,
            })

        # ── Dependency Edges (from ontology graph) ────────────────────────────
        weak_topic_ids = [ta.topic_id for ta in academic_profile.topic_accuracies if ta.is_weak]

        for weak_id in weak_topic_ids:
            impacts = dependency_graph.find_downstream_impacts(
                topic_id=weak_id, max_depth=3, min_strength=0.5
            )
            for impact in impacts:
                target_node_id = f"topic_{impact['topic_id']}"

                # Add target node if not already present
                if target_node_id not in topic_node_ids:
                    topic_node_ids.add(target_node_id)
                    nodes.append({
                        "id": target_node_id,
                        "type": "topic",
                        "label": impact["topic_name"],
                        "mastery": None,  # Not yet assessed
                        "mastery_label": "future_risk",
                        "is_weak": False,
                        "is_future_risk": True,
                        "grade": impact.get("grade"),
                        "subject": impact.get("subject"),
                    })

                edges.append({
                    "source": f"topic_{weak_id}",
                    "target": target_node_id,
                    "type": "at_risk",
                    "strength": impact["cumulative_impact"],
                    "grade_gap": impact.get("grade_gap", 0),
                    "is_cross_subject": impact.get("is_cross_subject", False),
                    "label": f"Weakness cascades (impact: {impact['cumulative_impact']:.0%})",
                    "path": " → ".join(impact.get("path", [])),
                })

        # ── Behavioral Nodes ──────────────────────────────────────────────────
        if behavioral_data:
            beh_score = behavioral_data.get("composite_score", 0)
            beh_trend = behavioral_data.get("trend", "stable")

            nodes.extend([
                {
                    "id": "behavior_participation",
                    "type": "behavior",
                    "label": "Class Participation",
                    "score": behavioral_data.get("participation_avg", 0),
                    "trend": beh_trend,
                    "category": "engagement",
                },
                {
                    "id": "behavior_leadership",
                    "type": "behavior",
                    "label": "Leadership",
                    "score": behavioral_data.get("leadership_avg", 0),
                    "trend": beh_trend,
                    "category": "social",
                },
                {
                    "id": "behavior_consistency",
                    "type": "behavior",
                    "label": "Assignment Consistency",
                    "score": behavioral_data.get("assignment_consistency", 0),
                    "trend": beh_trend,
                    "category": "discipline",
                },
            ])

            # Behavioral → Academic correlation edges
            if correlations.get("participation_academic_r", {}).get("significant"):
                r_val = correlations["participation_academic_r"]["value"]
                for ta in academic_profile.topic_accuracies[:3]:  # Top weak topics
                    edges.append({
                        "source": "behavior_participation",
                        "target": f"topic_{ta.topic_id}",
                        "type": "correlates",
                        "strength": abs(r_val),
                        "direction": "positive" if r_val > 0 else "negative",
                        "label": f"Participation {'supports' if r_val > 0 else 'weakly linked to'} academic score (r={r_val:.2f})",
                    })

        # ── Health Nodes ──────────────────────────────────────────────────────
        if health_data:
            nodes.append({
                "id": "health_attendance",
                "type": "health",
                "label": "Health Attendance Impact",
                "absence_count": health_data.get("absence_count", 0),
                "exam_period_absences": health_data.get("exam_absences", 0),
                "vision_flag": health_data.get("vision_flag", False),
                "severity": "high" if health_data.get("absence_count", 0) > 15 else "low",
            })

            if correlations.get("health_academic_r", {}).get("significant"):
                r_val = correlations["health_academic_r"]["value"]
                for ta in academic_profile.topic_accuracies[:2]:
                    edges.append({
                        "source": "health_attendance",
                        "target": f"topic_{ta.topic_id}",
                        "type": "correlates",
                        "strength": abs(r_val),
                        "label": f"Health absences correlate with academic performance (r={r_val:.2f})",
                    })

        # ── Sports Nodes ──────────────────────────────────────────────────────
        if sports_data:
            nodes.append({
                "id": "sports_profile",
                "type": "sports",
                "label": "Physical Activity Profile",
                "sports_list": sports_data.get("sports", []),
                "fitness_score": sports_data.get("fitness_score", 0),
                "leadership": sports_data.get("is_leader", False),
                "stress_resilience": sports_data.get("stress_resilience", 0),
            })

            if sports_data.get("is_leader"):
                edges.append({
                    "source": "sports_profile",
                    "target": "behavior_leadership",
                    "type": "correlates",
                    "strength": 0.65,
                    "label": "Sports leadership reinforces academic leadership behaviors",
                })

        # ── Graph Summary ─────────────────────────────────────────────────────
        n_topics = len(academic_profile.topic_accuracies)
        n_weak = len(academic_profile.weak_topics)
        n_critical = len(academic_profile.critical_topics)
        n_strong = len(academic_profile.strong_topics)
        n_at_risk_edges = sum(1 for e in edges if e["type"] == "at_risk")

        if n_critical >= 3 or (n_weak / max(n_topics, 1)) > 0.5:
            health = "serious_concern"
        elif n_critical >= 1 or (n_weak / max(n_topics, 1)) > 0.3:
            health = "moderate_concern"
        elif n_weak > 0:
            health = "mild_concern"
        else:
            health = "healthy"

        summary = {
            "total_topics": n_topics,
            "mastered_topics": n_strong,
            "weak_topics": n_weak,
            "critical_topics": n_critical,
            "future_risk_edges": n_at_risk_edges,
            "overall_health": health,
            "consistency_score": academic_profile.consistency_score,
            "improvement_trend": (
                "improving" if academic_profile.improvement_slope > 0.05
                else "declining" if academic_profile.improvement_slope < -0.05
                else "stable"
            ),
        }

        logger.info(
            "Knowledge graph built",
            student_id=student_id,
            nodes=len(nodes),
            edges=len(edges),
            health=health,
        )

        return {
            "student_id": student_id,
            "nodes": nodes,
            "edges": edges,
            "summary": summary,
        }
