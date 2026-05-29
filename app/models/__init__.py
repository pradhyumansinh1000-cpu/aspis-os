"""
app/models/__init__.py

Import all models here so Alembic autogenerate detects them all.
"""

from app.models.institution import Institution
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.teacher import Teacher, TeacherSubject
from app.models.subject import Subject, Topic
from app.models.assessment import Assessment, AssessmentQuestion, StudentScore
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.ai_report import AIReport, ReportType
from app.models.ocr_document import OCRDocument, OCRStatus
from app.models.speech_session import SpeechSession, SpeechStatus
from app.models.weak_topic import WeakTopic
from app.models.recommendation import Recommendation

# Missing Domain and Success Platform Models
from app.models.health_record import HealthRecord, HealthEventType, AttentionPattern
from app.models.sports_record import SportsRecord
from app.models.behavioral_record import BehavioralRecord
from app.models.intelligence_profile import StudentIntelligenceProfile, RiskPrediction, RiskLevel
from app.models.topic_dependency import TopicDependency, CurriculumOntology
from app.models.audit import DPDPAAuditLog

__all__ = [
    "Institution",
    "User",
    "UserRole",
    "Student",
    "Teacher",
    "TeacherSubject",
    "Subject",
    "Topic",
    "Assessment",
    "AssessmentQuestion",
    "StudentScore",
    "AttendanceRecord",
    "AttendanceSession",
    "AIReport",
    "ReportType",
    "OCRDocument",
    "OCRStatus",
    "SpeechSession",
    "SpeechStatus",
    "WeakTopic",
    "Recommendation",
    
    # Domain Records
    "HealthRecord",
    "HealthEventType",
    "AttentionPattern",
    "SportsRecord",
    "BehavioralRecord",
    
    # Graph and Predictions
    "StudentIntelligenceProfile",
    "RiskPrediction",
    "RiskLevel",
    "TopicDependency",
    "CurriculumOntology",
    "DPDPAAuditLog",
]
