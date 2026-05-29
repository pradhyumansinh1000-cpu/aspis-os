"""
app/analytics/correlation_engine.py — Cross-Domain Correlation Analysis

Discovers statistical relationships between:
  - Sports participation ↔ Discipline score
  - Health absences ↔ Academic performance
  - Behavioral participation ↔ Exam grades
  - Physical fitness ↔ Consistency

Uses Pearson correlation (linear relationships) and Spearman rank correlation
(non-linear, ordinal data like participation scores).

ARCHITECTURE LAW: Computes correlation values only.
LLM receives the r-values and generates the narrative interpretation.

Example LLM input:
  sports_discipline_r=0.72, health_performance_r=-0.61
  
Example LLM output:
  "Strong positive correlation between sports and discipline suggests this student
  channels physical activity into academic structure. The health-performance link
  indicates illness episodes are meaningfully disrupting learning continuity."
"""

import math
import statistics
from dataclasses import dataclass
from typing import Any


@dataclass
class CorrelationResult:
    factor_a: str
    factor_b: str
    pearson_r: float        # -1.0 to 1.0
    spearman_r: float | None
    n_samples: int
    interpretation: str     # "strong_positive" | "moderate_negative" | "negligible" etc.
    is_significant: bool    # True if n>=5 and |r|>0.3


class CorrelationEngine:
    """
    Computes Pearson and Spearman correlations between student data domains.
    All values are pure numbers — no LLM involvement.
    """

    def pearson(self, x: list[float], y: list[float]) -> float:
        """Pearson correlation coefficient between two numeric series."""
        n = len(x)
        if n < 3 or len(y) != n:
            return 0.0

        x_mean = statistics.mean(x)
        y_mean = statistics.mean(y)

        numerator = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, y))
        denom_x = math.sqrt(sum((xi - x_mean) ** 2 for xi in x))
        denom_y = math.sqrt(sum((yi - y_mean) ** 2 for yi in y))

        denominator = denom_x * denom_y
        if denominator == 0:
            return 0.0
        return round(numerator / denominator, 4)

    def spearman(self, x: list[float], y: list[float]) -> float:
        """Spearman rank correlation — better for non-linear relationships."""
        n = len(x)
        if n < 3:
            return 0.0

        def rank(lst: list[float]) -> list[float]:
            sorted_lst = sorted(enumerate(lst), key=lambda t: t[1])
            ranks = [0.0] * n
            for rank_val, (orig_idx, _) in enumerate(sorted_lst, 1):
                ranks[orig_idx] = float(rank_val)
            return ranks

        return self.pearson(rank(x), rank(y))

    def interpret(self, r: float, n: int) -> tuple[str, bool]:
        """
        Classify r value into human-readable category.
        Returns: (interpretation, is_significant)
        """
        is_significant = n >= 5 and abs(r) >= 0.3

        if abs(r) >= 0.70:
            strength = "strong"
        elif abs(r) >= 0.40:
            strength = "moderate"
        elif abs(r) >= 0.20:
            strength = "weak"
        else:
            strength = "negligible"

        direction = "positive" if r >= 0 else "negative"
        return (f"{strength}_{direction}", is_significant)

    def compute_student_correlations(
        self,
        academic_scores: list[float],       # Per-assessment % scores
        sports_attendance: list[float],     # Per-month sports attendance %
        behavioral_scores: list[float],     # Per-month behavioral composite
        health_absences: list[int],         # Per-month absence count
        assessment_dates: list[str],        # Aligned date strings
    ) -> dict[str, Any]:
        """
        Compute all cross-domain correlations for a student.
        All lists must be aligned by time period (month).
        
        Returns a correlation matrix dict ready for storage/LLM input.
        """
        results = {}

        # Sports ↔ Behavioral (discipline)
        if sports_attendance and behavioral_scores:
            n = min(len(sports_attendance), len(behavioral_scores))
            r = self.pearson(sports_attendance[:n], behavioral_scores[:n])
            interp, sig = self.interpret(r, n)
            results["sports_behavior_r"] = {
                "value": r, "interpretation": interp,
                "significant": sig, "n": n
            }

        # Health absences ↔ Academic scores
        if health_absences and academic_scores:
            n = min(len(health_absences), len(academic_scores))
            health_neg = [-h for h in health_absences[:n]]  # More absences = worse
            r = self.pearson(health_neg, academic_scores[:n])
            interp, sig = self.interpret(r, n)
            results["health_academic_r"] = {
                "value": r, "interpretation": interp,
                "significant": sig, "n": n
            }

        # Behavioral participation ↔ Academic scores
        if behavioral_scores and academic_scores:
            n = min(len(behavioral_scores), len(academic_scores))
            r = self.pearson(behavioral_scores[:n], academic_scores[:n])
            interp, sig = self.interpret(r, n)
            results["participation_academic_r"] = {
                "value": r, "interpretation": interp,
                "significant": sig, "n": n
            }

        # Sports ↔ Academic (complex relationship: moderate sports = best academics)
        if sports_attendance and academic_scores:
            n = min(len(sports_attendance), len(academic_scores))
            r = self.spearman(sports_attendance[:n], academic_scores[:n])
            interp, sig = self.interpret(r, n)
            results["sports_academic_spearman_r"] = {
                "value": r, "interpretation": interp,
                "significant": sig, "n": n
            }

        return results

    def compute_class_correlations(
        self,
        student_data_list: list[dict],  # Per-student aggregated data
    ) -> dict[str, Any]:
        """
        Compute class-level correlations across all students.
        Used for teacher dashboard insights.
        
        student_data format:
        [{"student_id": str, "avg_score": float, "attendance_pct": float,
          "behavioral_score": float, "sports_score": float}, ...]
        """
        if len(student_data_list) < 5:
            return {"note": "Insufficient students for correlation analysis"}

        scores = [d.get("avg_score", 0) for d in student_data_list]
        attendance = [d.get("attendance_pct", 0) for d in student_data_list]
        behavioral = [d.get("behavioral_score", 0) for d in student_data_list]
        sports = [d.get("sports_score", 0) for d in student_data_list]

        n = len(scores)
        return {
            "attendance_score_r": self.pearson(attendance, scores),
            "behavior_score_r": self.pearson(behavioral, scores),
            "sports_score_r": self.spearman(sports, scores),
            "class_size": n,
            "interpretation_note": (
                "Positive r = higher factor → higher score. "
                "Negative r = higher factor → lower score."
            ),
        }
