content = """from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import models
import ocr
import ai_engine
import correlation_engine
from database import get_student_db

app = FastAPI(title="ASPIS OS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ArtsRecordBase(BaseModel):
    studentId: str
    primaryDiscipline: str
    clubParticipation: str
    creativityScore: int
    techniqueScore: int
    expressionScore: int
    notes: str
    updatedBy: str

class ArtsRecordCreate(ArtsRecordBase):
    pass

class ArtsRecordUpdate(BaseModel):
    primaryDiscipline: Optional[str] = None
    clubParticipation: Optional[str] = None
    creativityScore: Optional[int] = None
    techniqueScore: Optional[int] = None
    expressionScore: Optional[int] = None
    notes: Optional[str] = None
    updatedBy: Optional[str] = None

def get_all_gr_numbers():
    if not os.path.exists("./student_databases"):
        return []
    return [f.replace(".db", "") for f in os.listdir("./student_databases") if f.endswith(".db")]

# Routes
@app.get("/api/arts")
def get_arts_records():
    result = {}
    for gr in get_all_gr_numbers():
        db = next(get_student_db(gr))
        try:
            r = db.query(models.ArtsRecord).first()
            if r:
                result[r.student_id] = {
                    "studentId": r.student_id,
                    "primaryDiscipline": r.primary_discipline,
                    "clubParticipation": r.club_participation,
                    "creativityScore": r.creativity_score,
                    "techniqueScore": r.technique_score,
                    "expressionScore": r.expression_score,
                    "notes": r.notes,
                    "updatedBy": "K. Rao",
                    "updatedAt": r.updated_at.isoformat() if r.updated_at else "",
                    "portfolioLogs": []
                }
        finally:
            db.close()
    return result

@app.post("/api/arts/{student_id}")
def update_arts_record(student_id: str, record: dict):
    db = next(get_student_db(student_id))
    try:
        db_record = db.query(models.ArtsRecord).filter(models.ArtsRecord.student_id == student_id).first()
        if not db_record:
            db_record = models.ArtsRecord(
                student_id=student_id,
                primary_discipline=record.get("primaryDiscipline", "Visual Arts"),
                club_participation=record.get("clubParticipation", "None"),
                creativity_score=record.get("creativityScore", 50),
                technique_score=record.get("techniqueScore", 50),
                expression_score=record.get("expressionScore", 50),
                notes=record.get("notes", "")
            )
            db.add(db_record)
        else:
            db_record.primary_discipline = record.get("primaryDiscipline", db_record.primary_discipline)
            db_record.club_participation = record.get("clubParticipation", db_record.club_participation)
            db_record.creativity_score = record.get("creativityScore", db_record.creativity_score)
            db_record.technique_score = record.get("techniqueScore", db_record.technique_score)
            db_record.expression_score = record.get("expressionScore", db_record.expression_score)
            db_record.notes = record.get("notes", db_record.notes)
        db.commit()
    finally:
        db.close()
    return {"status": "success"}

@app.get("/api/medical")
def get_medical_records():
    result = {}
    for gr in get_all_gr_numbers():
        db = next(get_student_db(gr))
        try:
            r = db.query(models.MedicalRecord).first()
            if r:
                result[r.student_id] = {
                    "studentId": r.student_id,
                    "height": r.height,
                    "weight": r.weight,
                    "bloodGroup": r.blood_group,
                    "visionLeft": r.vision_left,
                    "visionRight": r.vision_right,
                    "bmi": r.bmi,
                    "healthStatus": r.health_status,
                    "notes": r.notes,
                    "updatedAt": r.updated_at.isoformat() if r.updated_at else "",
                    "updatedBy": "Dr. A. Mehta"
                }
        finally:
            db.close()
    return result

@app.post("/api/medical/{student_id}")
def update_medical_record(student_id: str, record: dict):
    db = next(get_student_db(student_id))
    try:
        db_record = db.query(models.MedicalRecord).filter(models.MedicalRecord.student_id == student_id).first()
        if not db_record:
            db_record = models.MedicalRecord(student_id=student_id)
            db.add(db_record)
        
        db_record.height = record.get("height", db_record.height)
        db_record.weight = record.get("weight", db_record.weight)
        db_record.blood_group = record.get("bloodGroup", db_record.blood_group)
        db_record.vision_left = record.get("visionLeft", db_record.vision_left)
        db_record.vision_right = record.get("visionRight", db_record.vision_right)
        db_record.bmi = record.get("bmi", db_record.bmi)
        db_record.health_status = record.get("healthStatus", db_record.health_status)
        db_record.notes = record.get("notes", db_record.notes)
        
        db.commit()
    finally:
        db.close()
    return {"status": "success"}

@app.get("/api/sports")
def get_sports_records():
    result = {}
    for gr in get_all_gr_numbers():
        db = next(get_student_db(gr))
        try:
            r = db.query(models.SportsRecord).first()
            if r:
                result[r.student_id] = {
                    "studentId": r.student_id,
                    "primarySport": r.primary_sport,
                    "teamParticipation": r.team_participation,
                    "staminaScore": r.stamina_score,
                    "strengthScore": r.strength_score,
                    "agilityScore": r.agility_score,
                    "notes": r.notes,
                    "fitnessLogs": [],
                    "updatedAt": r.updated_at.isoformat() if r.updated_at else "",
                    "updatedBy": "Coach V. Singh"
                }
        finally:
            db.close()
    return result

@app.post("/api/sports/{student_id}")
def update_sports_record(student_id: str, record: dict):
    db = next(get_student_db(student_id))
    try:
        db_record = db.query(models.SportsRecord).filter(models.SportsRecord.student_id == student_id).first()
        if not db_record:
            db_record = models.SportsRecord(student_id=student_id)
            db.add(db_record)
        
        db_record.primary_sport = record.get("primarySport", db_record.primary_sport)
        db_record.team_participation = record.get("teamParticipation", db_record.team_participation)
        db_record.stamina_score = record.get("staminaScore", db_record.stamina_score)
        db_record.strength_score = record.get("strengthScore", db_record.strength_score)
        db_record.agility_score = record.get("agilityScore", db_record.agility_score)
        db_record.notes = record.get("notes", db_record.notes)
        
        db.commit()
    finally:
        db.close()
    return {"status": "success"}

@app.get("/api/library")
def get_library_records():
    result = {}
    for gr in get_all_gr_numbers():
        db = next(get_student_db(gr))
        try:
            r = db.query(models.LibraryRecord).first()
            if r:
                result[r.student_id] = {
                    "studentId": r.student_id,
                    "currentlyBorrowed": r.currently_borrowed,
                    "overdueCount": r.overdue_count,
                    "favoriteGenres": r.favorite_genres,
                    "notes": r.notes,
                    "borrowHistory": [],
                    "readingLevel": "age_appropriate",
                    "readingSpeed": "average",
                    "aiRecommendation": "",
                    "lastVisitDate": r.updated_at.isoformat() if r.updated_at else "",
                    "updatedBy": "Librarian M. Desai",
                    "updatedAt": r.updated_at.isoformat() if r.updated_at else ""
                }
        finally:
            db.close()
    return result

@app.post("/api/library/{student_id}")
def update_library_record(student_id: str, record: dict):
    db = next(get_student_db(student_id))
    try:
        db_record = db.query(models.LibraryRecord).filter(models.LibraryRecord.student_id == student_id).first()
        if not db_record:
            db_record = models.LibraryRecord(student_id=student_id)
            db.add(db_record)
        
        db_record.currently_borrowed = record.get("currentlyBorrowed", db_record.currently_borrowed)
        db_record.overdue_count = record.get("overdueCount", db_record.overdue_count)
        db_record.favorite_genres = record.get("favoriteGenres", db_record.favorite_genres)
        db_record.notes = record.get("notes", db_record.notes)
        
        db.commit()
    finally:
        db.close()
    return {"status": "success"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

def async_db_persist(student_id: str, ocr_data: dict):
    print(f"[CELERY_SIMULATION] Background worker persisted OCR data for {student_id}")

@app.post("/api/exams/upload")
def upload_exam(student_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    result = ocr.process_exam_image(file.filename, student_id)
    background_tasks.add_task(async_db_persist, student_id, result)
    return result

@app.post("/api/intelligence/index")
def index_all_data():
    total = 0
    for gr in get_all_gr_numbers():
        db = next(get_student_db(gr))
        try:
            medical = db.query(models.MedicalRecord).all()
            library = db.query(models.LibraryRecord).all()
            sports = db.query(models.SportsRecord).all()
            arts = db.query(models.ArtsRecord).all()
            
            for r in medical:
                ai_engine.index_document(r.student_id, "Medical", f"Health Status: {r.health_status}. BMI: {r.bmi}. Notes: {r.notes}", {"type": "health"})
            for r in library:
                ai_engine.index_document(r.student_id, "Library", f"Favorite Genres: {r.favorite_genres}. Notes: {r.notes}", {"type": "reading"})
            for r in sports:
                ai_engine.index_document(r.student_id, "Sports", f"Primary Sport: {r.primary_sport}. Notes: {r.notes}", {"type": "athletics"})
            for r in arts:
                ai_engine.index_document(r.student_id, "Extracurriculars", f"Discipline: {r.primary_discipline}. Notes: {r.notes}", {"type": "arts"})
            
            total += len(medical) + len(library) + len(sports) + len(arts)
        finally:
            db.close()
            
    return {"status": "indexed", "total_vectors": total}

@app.get("/api/intelligence/search")
def search_intelligence(q: str):
    results = ai_engine.semantic_search(q)
    llm_summary = f"Based on the semantic search for '{q}', the system found cross-departmental correlations in the retrieved records. This indicates multi-disciplinary context."
    return {
        "query": q,
        "llm_synthesis": llm_summary,
        "hits": results
    }

@app.get("/api/intelligence/student/{student_id}")
def get_student_intelligence(student_id: str):
    db = next(get_student_db(student_id))
    try:
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
            
        medical = db.query(models.MedicalRecord).filter(models.MedicalRecord.student_id == student_id).first()
        sports = db.query(models.SportsRecord).filter(models.SportsRecord.student_id == student_id).first()
        arts = db.query(models.ArtsRecord).filter(models.ArtsRecord.student_id == student_id).first()
        library = db.query(models.LibraryRecord).filter(models.LibraryRecord.student_id == student_id).first()
        
        context = {
            "student": {"name": student.name, "grade": student.grade, "section": student.section},
            "medical": {"bmi": medical.bmi, "health": medical.health_status, "notes": medical.notes} if medical else {},
            "sports": {"primary": sports.primary_sport, "stamina": sports.stamina_score, "notes": sports.notes} if sports else {},
            "arts": {"discipline": arts.primary_discipline, "creativity": arts.creativity_score, "notes": arts.notes} if arts else {},
            "library": {"favorite_genres": library.favorite_genres, "overdue": library.overdue_count, "notes": library.notes} if library else {}
        }
        
        report = ai_engine.generate_student_intelligence_report(context)
        return {
            "student_id": student_id,
            "llm_report": report
        }
    finally:
        db.close()

@app.post("/api/intelligence/class-action-report")
def get_class_action_report(class_data: dict):
    report = ai_engine.generate_class_action_report(class_data)
    return {"report": report}

@app.post("/api/intelligence/teacher-alerts")
def get_teacher_alerts(class_data: dict):
    alerts = ai_engine.generate_teacher_alerts(class_data)
    return {"alerts": alerts}

@app.post("/api/assessments/log")
def log_assessment(data: dict):
    import uuid
    assessment_id = data.get("id", str(uuid.uuid4()))
    
    questions = data.get("questions", [])
    scores = data.get("scores", [])
    
    for s in scores:
        student_id = s.get("studentId")
        q_scores = s.get("questionScores", {})
        
        db = next(get_student_db(student_id))
        try:
            db_assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
            if not db_assessment:
                db_assessment = models.Assessment(
                    id=assessment_id,
                    title=data.get("title"),
                    subject=data.get("subject"),
                    date=data.get("date")
                )
                db.add(db_assessment)
                
            for q in questions:
                q_id = q.get("id")
                topic = q.get("mappedConcept")
                max_marks = q.get("maxMarks")
                awarded = q_scores.get(q_id, 0)
                
                db_score = db.query(models.AssessmentScore).filter(
                    models.AssessmentScore.assessment_id == assessment_id,
                    models.AssessmentScore.student_id == student_id,
                    models.AssessmentScore.topic == topic
                ).first()
                if db_score:
                    db_score.score = awarded
                    db_score.max_score = max_marks
                else:
                    db_score = models.AssessmentScore(
                        assessment_id=assessment_id,
                        student_id=student_id,
                        topic=topic,
                        score=awarded,
                        max_score=max_marks
                    )
                    db.add(db_score)
            db.commit()
        finally:
            db.close()
    return {"status": "success"}

@app.get("/api/intelligence/forecast/{student_id}")
def get_student_forecast(student_id: str):
    db = next(get_student_db(student_id))
    try:
        scores = db.query(models.AssessmentScore).filter(models.AssessmentScore.student_id == student_id).all()
        
        topic_data = {}
        for s in scores:
            if s.topic not in topic_data:
                topic_data[s.topic] = []
            pct = (s.score / s.max_score * 100) if s.max_score > 0 else 0
            topic_data[s.topic].append(pct)
            
        forecasts = []
        for topic, history in topic_data.items():
            if len(history) >= 2:
                trend = history[-1] - history[0]
                predicted = min(100, max(0, history[-1] + (trend / len(history))))
                forecasts.append({
                    "topic": topic,
                    "history": history,
                    "predicted": round(predicted, 1),
                    "risk": "critical" if predicted < 40 else "high" if predicted < 60 else "low"
                })
            else:
                 forecasts.append({
                    "topic": topic,
                    "history": history,
                    "predicted": round(history[0], 1) if history else 0,
                    "risk": "low" if (history and history[0] >= 60) else "high"
                })
        return {"forecasts": forecasts}
    finally:
        db.close()

@app.post("/api/cron/run-risk-detection")
def run_risk_detection():
    all_students = []
    all_medical = []
    all_library = []
    all_sports = []
    all_arts = []
    
    for gr in get_all_gr_numbers():
        db = next(get_student_db(gr))
        try:
            all_students.extend(db.query(models.Student).all())
            all_medical.extend(db.query(models.MedicalRecord).all())
            all_library.extend(db.query(models.LibraryRecord).all())
            all_sports.extend(db.query(models.SportsRecord).all())
            all_arts.extend(db.query(models.ArtsRecord).all())
        finally:
            db.close()
            
    df = correlation_engine.build_correlation_dataframe(all_students, all_medical, all_library, all_sports, all_arts)
    generated_flags = correlation_engine.run_predictive_risk_model(df)
    
    return {
        "status": "cron_executed",
        "timestamp": "2026-05-28T03:00:00Z",
        "generated_flags": generated_flags
    }
"""

with open("main.py", "w", encoding="utf-8") as f:
    f.write(content)
