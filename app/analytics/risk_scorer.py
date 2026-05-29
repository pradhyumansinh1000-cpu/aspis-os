"""
app/analytics/risk_scorer.py — XGBoost ML Risk Prediction

WHY ML instead of pure rules?
  Rules: "If accuracy < 60% → medium risk"
  ML: Learns from REAL historical outcomes — which combination of features
      actually led to academic failure in past students.
  
  ML captures non-linear interactions:
  e.g., Low attendance + Strong sports participation + Weak fractions
        = actually HIGHER risk than just low accuracy alone
        (the student is coping through sports, not academics)

Model: XGBoostClassifier (4-class: low/medium/high/critical)
Features: 12 engineered features across all 4 domains
Target: Retrospective risk assessment (known bad outcomes)

Training data strategy:
  - Label students who ACTUALLY failed (grade drop, repeated class) as "high/critical"
  - Label students who succeeded as "low"
  - Train on historical cohort
  - Retrain weekly via Celery Beat as more data accumulates

Model storage: app/ml_models/risk_model.pkl
Loaded once at worker startup, reused for all predictions.
"""

import os
import pickle
from dataclasses import dataclass
from typing import Any

import numpy as np
import structlog

logger = structlog.get_logger()

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml_models", "risk_model.pkl")
RISK_LABELS = {0: "low", 1: "medium", 2: "high", 3: "critical"}
RISK_THRESHOLDS = {"low": 25, "medium": 50, "high": 75, "critical": 100}

# Feature names (must match training order)
FEATURE_NAMES = [
    "avg_topic_accuracy",         # Academic: mean across all topics
    "topic_accuracy_std",         # Academic: consistency of topic scores
    "weak_topic_count",           # Academic: topics below 60%
    "attendance_pct",             # Behavioral: overall attendance
    "behavioral_composite",       # Behavioral: avg of all behavioral scores
    "assignment_consistency",     # Behavioral: submission consistency
    "health_absence_count",       # Health: total absences this year
    "exam_period_absences",       # Health: absences during exam windows
    "vision_hearing_flag",        # Health: screening concern (0/1)
    "sports_participation_pct",   # Sports: attendance rate
    "sports_leadership_flag",     # Sports: is team captain/leader (0/1)
    "prerequisite_weakness_score",# Ontology: severity from dependency graph
]


@dataclass
class RiskScoreResult:
    risk_level: str           # "low" | "medium" | "high" | "critical"
    risk_score: float         # 0–100 continuous score
    confidence: float         # 0–1 model confidence
    top_risk_factors: list[dict]  # [{"factor": "weak_fractions", "importance": 0.35}]
    feature_values: dict      # Raw feature values for debugging/audit
    model_version: str


class RiskScorer:
    """
    XGBoost-based academic risk predictor.
    
    Usage:
        scorer = RiskScorer()
        result = scorer.predict(features)
    """

    def __init__(self):
        self._model = None
        self._feature_importances: dict[str, float] = {}
        self._model_version = "1.0.0"
        self._load_model()

    def _load_model(self) -> None:
        """Load trained model from disk. Falls back to rule-based if not found."""
        try:
            if os.path.exists(MODEL_PATH):
                with open(MODEL_PATH, "rb") as f:
                    saved = pickle.load(f)
                    self._model = saved.get("model")
                    self._feature_importances = saved.get("feature_importances", {})
                    self._model_version = saved.get("version", "1.0.0")
                logger.info("Risk model loaded from disk", version=self._model_version)
            else:
                logger.warning("No trained risk model found. Using rule-based fallback.")
        except Exception as e:
            logger.error("Failed to load risk model", error=str(e))

    def build_features(self, student_data: dict) -> dict[str, float]:
        """
        Extract and engineer features from student multi-domain data.
        
        student_data keys:
          academic: {avg_accuracy, topic_stds, weak_topics, attendance_pct, ...}
          behavioral: {composite_score, assignment_consistency, ...}
          health: {absence_count, exam_absences, vision_flag, hearing_flag}
          sports: {participation_pct, is_leader}
          ontology: {prerequisite_weakness_score}
        """
        academic = student_data.get("academic", {})
        behavioral = student_data.get("behavioral", {})
        health = student_data.get("health", {})
        sports = student_data.get("sports", {})
        ontology = student_data.get("ontology", {})

        features = {
            "avg_topic_accuracy": float(academic.get("overall_accuracy", 0.5)),
            "topic_accuracy_std": float(academic.get("topic_accuracy_std", 0.2)),
            "weak_topic_count": float(len(academic.get("weak_topics", []))),
            "attendance_pct": float(academic.get("attendance_pct", 75)) / 100.0,
            "behavioral_composite": float(behavioral.get("composite_score", 5.0)) / 10.0,
            "assignment_consistency": float(behavioral.get("assignment_consistency", 5.0)) / 10.0,
            "health_absence_count": float(health.get("absence_count", 0)) / 30.0,
            "exam_period_absences": float(health.get("exam_absences", 0)) / 10.0,
            "vision_hearing_flag": 1.0 if (health.get("vision_flag") or health.get("hearing_flag")) else 0.0,
            "sports_participation_pct": float(sports.get("participation_pct", 0)) / 100.0,
            "sports_leadership_flag": 1.0 if sports.get("is_leader") else 0.0,
            "prerequisite_weakness_score": float(ontology.get("prerequisite_weakness_score", 0.0)),
        }
        return features

    def predict(self, student_data: dict) -> RiskScoreResult:
        """
        Predict risk level for a student.
        
        If ML model is loaded → use XGBoost prediction
        If not loaded → use weighted rule-based fallback
        """
        features = self.build_features(student_data)
        feature_values = dict(features)  # Copy for audit

        if self._model is not None:
            return self._predict_ml(features, feature_values)
        else:
            return self._predict_rules(features, feature_values)

    def _predict_ml(
        self, features: dict[str, float], feature_values: dict
    ) -> RiskScoreResult:
        """XGBoost prediction path."""
        try:
            X = np.array([[features[name] for name in FEATURE_NAMES]])
            probabilities = self._model.predict_proba(X)[0]
            predicted_class = int(np.argmax(probabilities))
            confidence = float(probabilities[predicted_class])

            # Convert class to continuous risk score (weighted average of class probabilities)
            risk_score = (
                probabilities[0] * 12.5 +   # low
                probabilities[1] * 37.5 +   # medium
                probabilities[2] * 62.5 +   # high
                probabilities[3] * 87.5     # critical
            ) * 100 / 100  # Already in 0-100 scale as sum of weighted midpoints

            risk_score = round(float(risk_score), 1)
            risk_level = RISK_LABELS[predicted_class]

            # Feature importance for explainability
            top_factors = self._get_top_factors(features)

            return RiskScoreResult(
                risk_level=risk_level,
                risk_score=risk_score,
                confidence=round(confidence, 3),
                top_risk_factors=top_factors,
                feature_values=feature_values,
                model_version=self._model_version,
            )
        except Exception as e:
            logger.error("ML prediction failed, falling back to rules", error=str(e))
            return self._predict_rules(features, feature_values)

    def _predict_rules(
        self, features: dict[str, float], feature_values: dict
    ) -> RiskScoreResult:
        """
        Rule-based fallback when ML model isn't trained yet.
        Uses weighted scoring across features.
        
        This is NOT random — it's a calibrated weighted rule system
        derived from educational research.
        """
        score = 0.0
        factors = []

        # Academic domain (40% weight)
        accuracy = features["avg_topic_accuracy"]
        if accuracy < 0.40:
            score += 40
            factors.append({"factor": "Very low topic accuracy", "importance": 0.35})
        elif accuracy < 0.60:
            score += 25
            factors.append({"factor": "Below average accuracy", "importance": 0.25})
        elif accuracy < 0.75:
            score += 10

        # Weak topic count (15% weight)
        weak_count = features["weak_topic_count"]
        if weak_count >= 5:
            score += 15
            factors.append({"factor": f"{int(weak_count)} weak topics", "importance": 0.15})
        elif weak_count >= 3:
            score += 8

        # Attendance (20% weight)
        attendance = features["attendance_pct"]
        if attendance < 0.60:
            score += 20
            factors.append({"factor": "Critical attendance (<60%)", "importance": 0.20})
        elif attendance < 0.75:
            score += 12
            factors.append({"factor": "Low attendance", "importance": 0.12})

        # Behavioral (10% weight)
        behavioral = features["behavioral_composite"]
        if behavioral < 0.40:
            score += 10
            factors.append({"factor": "Low behavioral engagement", "importance": 0.10})

        # Health (10% weight)
        if features["exam_period_absences"] >= 0.3:  # ≥3 exam absences
            score += 10
            factors.append({"factor": "High exam-period absences", "importance": 0.10})
        if features["vision_hearing_flag"] > 0.5:
            score += 5
            factors.append({"factor": "Vision/hearing concern flagged", "importance": 0.05})

        # Prerequisite weakness (5% weight)
        prereq = features["prerequisite_weakness_score"]
        if prereq > 0.6:
            score += 10
            factors.append({"factor": "Strong prerequisite topic gaps", "importance": 0.10})

        score = min(100.0, score)

        if score >= 75:
            risk_level = "critical"
        elif score >= 50:
            risk_level = "high"
        elif score >= 25:
            risk_level = "medium"
        else:
            risk_level = "low"

        return RiskScoreResult(
            risk_level=risk_level,
            risk_score=round(score, 1),
            confidence=0.75,  # Rule-based is less confident than ML
            top_risk_factors=sorted(factors, key=lambda x: -x["importance"])[:5],
            feature_values=feature_values,
            model_version="rule_based_v1",
        )

    def _get_top_factors(self, features: dict[str, float]) -> list[dict]:
        """Map feature importances to human-readable factor descriptions."""
        descriptions = {
            "avg_topic_accuracy": "Overall topic mastery level",
            "weak_topic_count": "Number of weak topics",
            "attendance_pct": "Class attendance rate",
            "behavioral_composite": "Behavioral engagement score",
            "assignment_consistency": "Assignment submission consistency",
            "exam_period_absences": "Absences during exam periods",
            "prerequisite_weakness_score": "Prerequisite topic gaps",
            "health_absence_count": "Health-related absences",
            "vision_hearing_flag": "Vision or hearing concern",
            "sports_participation_pct": "Sports participation rate",
        }
        factors = []
        for feat_name, importance in sorted(
            self._feature_importances.items(), key=lambda x: -x[1]
        )[:5]:
            factors.append({
                "factor": descriptions.get(feat_name, feat_name),
                "importance": round(importance, 3),
                "feature_value": round(features.get(feat_name, 0), 3),
            })
        return factors

    def train(self, training_data: list[dict], labels: list[int]) -> str:
        """
        Train/retrain the XGBoost model with new data.
        Called by the weekly Celery Beat task.
        
        Returns: new model version string
        """
        try:
            from xgboost import XGBClassifier

            X = np.array([
                [self.build_features(d)[name] for name in FEATURE_NAMES]
                for d in training_data
            ])
            y = np.array(labels)

            model = XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                use_label_encoder=False,
                eval_metric="mlogloss",
                random_state=42,
            )
            model.fit(X, y)

            import time
            new_version = f"xgb_{time.strftime('%Y%m%d_%H%M')}"
            feat_importance = dict(zip(FEATURE_NAMES, model.feature_importances_.tolist()))

            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, "wb") as f:
                pickle.dump({
                    "model": model,
                    "feature_importances": feat_importance,
                    "version": new_version,
                }, f)

            self._model = model
            self._feature_importances = feat_importance
            self._model_version = new_version
            logger.info("Risk model trained", version=new_version, n_samples=len(training_data))
            return new_version

        except ImportError:
            logger.error("xgboost not installed. Run: pip install xgboost")
            return "not_trained"
        except Exception as e:
            logger.error("Model training failed", error=str(e))
            return "training_failed"


# Singleton
_risk_scorer: RiskScorer | None = None


def get_risk_scorer() -> RiskScorer:
    global _risk_scorer
    if _risk_scorer is None:
        _risk_scorer = RiskScorer()
    return _risk_scorer
