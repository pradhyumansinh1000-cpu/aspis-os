"""
app/analytics/academic_analyzer.py — Pure Python Academic Analysis

ARCHITECTURE LAW: This module NEVER calls the LLM.
It computes numbers. The LLM interprets those numbers.

Computations here:
  - Topic-level accuracy
  - Mistake type classification (careless vs conceptual)
  - Theory vs application gap
  - Consistency score (standard deviation analysis)
  - Improvement trend (regression slope)
  - Score distribution analysis
"""

import statistics
from dataclasses import dataclass, field
from typing import Any


@dataclass
class TopicAccuracyResult:
    topic_id: str
    topic_name: str
    accuracy: float           # 0.0–1.0
    data_points: int
    is_weak: bool
    severity: float           # 0.0–1.0
    mistake_type: str         # "careless" | "conceptual" | "mixed" | "insufficient_data"
    variance: float           # High variance = careless; Low variance with low score = conceptual


@dataclass
class AcademicProfile:
    """Complete computed academic profile — input to LLM interpretation."""
    student_id: str
    subject_performances: list[dict] = field(default_factory=list)
    topic_accuracies: list[TopicAccuracyResult] = field(default_factory=list)
    consistency_score: float = 0.0        # 0–10: 10=perfectly consistent
    improvement_slope: float = 0.0        # Positive=improving, Negative=declining
    theory_vs_application_gap: float = 0.0  # Positive=better at theory, Negative=better at application
    overall_accuracy: float = 0.0
    careless_mistake_pct: float = 0.0
    conceptual_mistake_pct: float = 0.0
    strong_topics: list[str] = field(default_factory=list)   # topics with accuracy ≥ 0.80
    weak_topics: list[str] = field(default_factory=list)     # topics with accuracy < 0.60
    critical_topics: list[str] = field(default_factory=list) # accuracy < 0.40


class AcademicAnalyzer:
    """
    Computes all academic metrics from raw score data.
    No LLM, no external calls — pure Python statistics.
    """

    WEAK_THRESHOLD = 0.60
    STRONG_THRESHOLD = 0.80
    CRITICAL_THRESHOLD = 0.40
    MIN_DATA_POINTS = 2

    # Careless mistake signature:
    # High variance in a topic students SHOULD know well
    # (Theory score is high but application score low on SAME topic)
    CARELESS_VARIANCE_THRESHOLD = 0.08  # std dev > this = careless pattern

    def analyze(self, scores: list[dict]) -> AcademicProfile:
        """
        Main entry point.
        
        scores format:
        [
          {
            "student_id": "uuid",
            "topic_id": "uuid",
            "topic_name": "Fractions",
            "marks_obtained": 4.5,
            "max_marks": 10.0,
            "question_type": "theory|application|mcq",
            "assessment_date": "2024-11-15",
            "subject": "Mathematics",
          },
          ...
        ]
        """
        if not scores:
            return AcademicProfile(student_id="")

        student_id = scores[0].get("student_id", "")
        topic_accuracies = self._compute_topic_accuracies(scores)
        consistency = self._compute_consistency(scores)
        trend = self._compute_improvement_trend(scores)
        gap = self._compute_theory_application_gap(scores)
        overall = self._compute_overall_accuracy(scores)
        mistake_dist = self._compute_mistake_distribution(topic_accuracies)

        strong = [t.topic_name for t in topic_accuracies if t.accuracy >= self.STRONG_THRESHOLD]
        weak = [t.topic_name for t in topic_accuracies if t.accuracy < self.WEAK_THRESHOLD]
        critical = [t.topic_name for t in topic_accuracies if t.accuracy < self.CRITICAL_THRESHOLD]

        return AcademicProfile(
            student_id=student_id,
            topic_accuracies=topic_accuracies,
            consistency_score=round(consistency, 2),
            improvement_slope=round(trend, 4),
            theory_vs_application_gap=round(gap, 2),
            overall_accuracy=round(overall, 4),
            careless_mistake_pct=round(mistake_dist["careless"], 2),
            conceptual_mistake_pct=round(mistake_dist["conceptual"], 2),
            strong_topics=strong,
            weak_topics=weak,
            critical_topics=critical,
        )

    def _compute_topic_accuracies(self, scores: list[dict]) -> list[TopicAccuracyResult]:
        """
        Group scores by topic, compute accuracy and variance.
        High variance on simple topics → careless mistakes.
        Low variance + low accuracy on complex topics → conceptual gap.
        """
        from collections import defaultdict
        topic_groups: dict[str, list[dict]] = defaultdict(list)

        for s in scores:
            if s.get("topic_id") and s.get("max_marks", 0) > 0:
                topic_groups[s["topic_id"]].append(s)

        results = []
        for topic_id, topic_scores in topic_groups.items():
            topic_name = topic_scores[0].get("topic_name", "Unknown")
            n = len(topic_scores)

            per_question_accuracy = [
                s["marks_obtained"] / s["max_marks"] for s in topic_scores
            ]
            accuracy = statistics.mean(per_question_accuracy)
            variance = statistics.stdev(per_question_accuracy) if n >= 2 else 0.0

            is_weak = accuracy < self.WEAK_THRESHOLD
            severity = max(0.0, (self.WEAK_THRESHOLD - accuracy) / self.WEAK_THRESHOLD) if is_weak else 0.0

            # Mistake classification logic:
            # Careless: high variance (gets it right sometimes, wrong other times)
            # Conceptual: low variance + low accuracy (consistently wrong)
            if n < self.MIN_DATA_POINTS:
                mistake_type = "insufficient_data"
            elif variance >= self.CARELESS_VARIANCE_THRESHOLD and is_weak:
                mistake_type = "careless"
            elif variance < self.CARELESS_VARIANCE_THRESHOLD and is_weak:
                mistake_type = "conceptual"
            elif variance >= self.CARELESS_VARIANCE_THRESHOLD and not is_weak:
                mistake_type = "mixed"  # Generally good but inconsistent
            else:
                mistake_type = "proficient"

            results.append(TopicAccuracyResult(
                topic_id=topic_id,
                topic_name=topic_name,
                accuracy=round(accuracy, 4),
                data_points=n,
                is_weak=is_weak,
                severity=round(severity, 4),
                mistake_type=mistake_type,
                variance=round(variance, 4),
            ))

        # Sort: most severe weak topics first
        results.sort(key=lambda x: (-x.severity, x.topic_name))
        return results

    def _compute_consistency(self, scores: list[dict]) -> float:
        """
        Consistency score 0–10 based on assessment-level score variance.
        
        Groups scores by assessment, computes overall assessment score,
        then measures consistency across assessments.
        
        Score 10 = same performance every time (high consistency)
        Score 0 = wildly varying (unpredictable)
        """
        from collections import defaultdict
        assessment_totals: dict[str, dict] = defaultdict(lambda: {"obtained": 0.0, "max": 0.0})

        for s in scores:
            aid = s.get("assessment_id", "")
            if aid and s.get("max_marks", 0) > 0:
                assessment_totals[aid]["obtained"] += s["marks_obtained"]
                assessment_totals[aid]["max"] += s["max_marks"]

        if len(assessment_totals) < 2:
            return 5.0  # Not enough data — neutral score

        percentages = [
            (v["obtained"] / v["max"] * 100)
            for v in assessment_totals.values()
            if v["max"] > 0
        ]

        std_dev = statistics.stdev(percentages)
        # Map std_dev to 0–10 scale: std_dev=0→10, std_dev=25→0
        consistency = max(0.0, 10.0 - (std_dev / 2.5))
        return consistency

    def _compute_improvement_trend(self, scores: list[dict]) -> float:
        """
        Linear regression slope on assessment scores over time.
        
        Positive slope → improving
        Negative slope → declining
        Near zero → stable
        
        Returns slope normalized to [-1, 1] range.
        """
        from collections import defaultdict
        assessment_data: dict[str, dict] = defaultdict(lambda: {"obtained": 0.0, "max": 0.0, "date": ""})

        for s in scores:
            aid = s.get("assessment_id", "")
            if aid:
                assessment_data[aid]["obtained"] += s.get("marks_obtained", 0)
                assessment_data[aid]["max"] += s.get("max_marks", 1)
                assessment_data[aid]["date"] = s.get("assessment_date", "")

        # Sort chronologically
        sorted_assessments = sorted(
            assessment_data.items(),
            key=lambda x: x[1]["date"] or ""
        )

        if len(sorted_assessments) < 3:
            return 0.0  # Not enough assessments for trend

        points = [
            (i, (v["obtained"] / v["max"] * 100) if v["max"] > 0 else 0)
            for i, (_, v) in enumerate(sorted_assessments)
        ]

        n = len(points)
        x_vals = [p[0] for p in points]
        y_vals = [p[1] for p in points]
        x_mean = statistics.mean(x_vals)
        y_mean = statistics.mean(y_vals)

        numerator = sum((x - x_mean) * (y - y_mean) for x, y in points)
        denominator = sum((x - x_mean) ** 2 for x in x_vals)

        if denominator == 0:
            return 0.0

        slope = numerator / denominator  # Points per assessment
        # Normalize: slope of +5 per assessment = max positive, -5 = max negative
        return max(-1.0, min(1.0, slope / 5.0))

    def _compute_theory_application_gap(self, scores: list[dict]) -> float:
        """
        Compare theory question accuracy vs application question accuracy.
        
        Positive → better at theory (struggles with applications)
        Negative → better at applications (weak in recall/theory)
        Near zero → balanced
        
        Uses question_type field: "theory" | "application" | "mcq"
        """
        theory_scores = [s for s in scores if s.get("question_type") == "theory"]
        application_scores = [s for s in scores if s.get("question_type") == "application"]

        if not theory_scores or not application_scores:
            return 0.0

        theory_acc = statistics.mean([
            s["marks_obtained"] / s["max_marks"]
            for s in theory_scores if s.get("max_marks", 0) > 0
        ])
        application_acc = statistics.mean([
            s["marks_obtained"] / s["max_marks"]
            for s in application_scores if s.get("max_marks", 0) > 0
        ])

        return round((theory_acc - application_acc) * 100, 2)  # In percentage points

    def _compute_overall_accuracy(self, scores: list[dict]) -> float:
        total_obtained = sum(s.get("marks_obtained", 0) for s in scores)
        total_max = sum(s.get("max_marks", 0) for s in scores)
        return total_obtained / total_max if total_max > 0 else 0.0

    def _compute_mistake_distribution(
        self, topic_accuracies: list[TopicAccuracyResult]
    ) -> dict[str, float]:
        """Distribution of mistake types across weak topics."""
        weak_topics = [t for t in topic_accuracies if t.is_weak]
        if not weak_topics:
            return {"careless": 0.0, "conceptual": 0.0, "mixed": 0.0}

        total = len(weak_topics)
        careless = sum(1 for t in weak_topics if t.mistake_type == "careless")
        conceptual = sum(1 for t in weak_topics if t.mistake_type == "conceptual")
        mixed = sum(1 for t in weak_topics if t.mistake_type == "mixed")

        return {
            "careless": careless / total * 100,
            "conceptual": conceptual / total * 100,
            "mixed": mixed / total * 100,
        }
