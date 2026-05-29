from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from database import Base

class Student(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    grade = Column(String)
    section = Column(String)
    roll = Column(String)

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), unique=True)
    height = Column(String)
    weight = Column(String)
    blood_group = Column(String)
    vision_left = Column(String)
    vision_right = Column(String)
    bmi = Column(String)
    health_status = Column(String)
    notes = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class LibraryRecord(Base):
    __tablename__ = "library_records"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), unique=True)
    currently_borrowed = Column(String)
    overdue_count = Column(Integer)
    favorite_genres = Column(String)
    notes = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SportsRecord(Base):
    __tablename__ = "sports_records"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), unique=True)
    primary_sport = Column(String)
    team_participation = Column(String)
    stamina_score = Column(Integer)
    strength_score = Column(Integer)
    agility_score = Column(Integer)
    notes = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ArtsRecord(Base):
    __tablename__ = "arts_records"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), unique=True)
    primary_discipline = Column(String)
    club_participation = Column(String)
    creativity_score = Column(Integer)
    technique_score = Column(Integer)
    expression_score = Column(Integer)
    notes = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    subject = Column(String)
    date = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AssessmentScore(Base):
    __tablename__ = "assessment_scores"
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(String, ForeignKey("assessments.id"))
    student_id = Column(String, ForeignKey("students.id"))
    topic = Column(String)
    score = Column(Float)
    max_score = Column(Float)
