import os
from database import get_student_db, Base, _engine_cache
import models

def create_and_seed_student(gr_number, student_data, medical, library, sports, arts):
    print(f"Creating isolated schema for student: {gr_number}")
    
    # Remove existing db if exists
    db_path = f"./student_databases/{gr_number}.db"
    if os.path.exists(db_path):
        os.remove(db_path)
    
    # Clear cache to force recreation
    if gr_number in _engine_cache:
        del _engine_cache[gr_number]
        
    db_generator = get_student_db(gr_number)
    db = next(db_generator)
    
    try:
        # Seed student
        db.add(student_data)
        if medical: db.add(medical)
        if library: db.add(library)
        if sports: db.add(sports)
        if arts: db.add(arts)
        
        # Add mock assessments if this is s1, s2, or s3 to demonstrate forecast
        if gr_number == "s1":
            db.add(models.Assessment(id="a1", title="Midterm", subject="Math", date="2026-01-01"))
            db.add_all([
                models.AssessmentScore(assessment_id="a1", student_id="s1", topic="Algebra", score=40, max_score=100),
                models.AssessmentScore(assessment_id="a1", student_id="s1", topic="Algebra", score=35, max_score=100),
                models.AssessmentScore(assessment_id="a1", student_id="s1", topic="Algebra", score=30, max_score=100),
                models.AssessmentScore(assessment_id="a1", student_id="s1", topic="Physics", score=70, max_score=100),
                models.AssessmentScore(assessment_id="a1", student_id="s1", topic="Physics", score=65, max_score=100),
            ])
        elif gr_number == "s2":
            db.add(models.Assessment(id="a2", title="Midterm", subject="Math", date="2026-01-01"))
            db.add_all([
                models.AssessmentScore(assessment_id="a2", student_id="s2", topic="Geometry", score=80, max_score=100),
                models.AssessmentScore(assessment_id="a2", student_id="s2", topic="Geometry", score=85, max_score=100),
                models.AssessmentScore(assessment_id="a2", student_id="s2", topic="Geometry", score=90, max_score=100),
            ])
            
        db.commit()
    finally:
        db.close()

def seed():
    # Ensure directory exists
    os.makedirs("./student_databases", exist_ok=True)
    
    # s1
    create_and_seed_student(
        "s1", 
        models.Student(id="s1", name="Rahul Sharma", grade="9", section="A", roll="12"),
        models.MedicalRecord(student_id="s1", height="165cm", weight="70kg", blood_group="O+", vision_left="6/12", vision_right="6/9", bmi="25.7", health_status="Needs Attention", notes="Slightly overweight, poor vision might affect board work."),
        models.LibraryRecord(student_id="s1", currently_borrowed="Dune", overdue_count=2, favorite_genres="Science Fiction, Fantasy", notes="Avid reader, but often returns books late."),
        models.SportsRecord(student_id="s1", primary_sport="Cricket", team_participation="School Team B", stamina_score=60, strength_score=75, agility_score=65, notes="Good strength but low stamina. Correlates with high BMI."),
        models.ArtsRecord(student_id="s1", primary_discipline="Drama", club_participation="Theater Club", creativity_score=90, technique_score=70, expression_score=95, notes="Very expressive, great communication skills.")
    )

    # s2
    create_and_seed_student(
        "s2", 
        models.Student(id="s2", name="Priya Patel", grade="9", section="A", roll="18"),
        models.MedicalRecord(student_id="s2", height="160cm", weight="50kg", blood_group="A+", vision_left="6/6", vision_right="6/6", bmi="19.5", health_status="Healthy", notes="Fit and active."),
        models.LibraryRecord(student_id="s2", currently_borrowed="A Brief History of Time", overdue_count=0, favorite_genres="Non-fiction, Science", notes="Advanced reading level."),
        models.SportsRecord(student_id="s2", primary_sport="Basketball", team_participation="School Team A", stamina_score=90, strength_score=80, agility_score=95, notes="Excellent athlete, high energy."),
        models.ArtsRecord(student_id="s2", primary_discipline="Visual Arts", club_participation="Art Club", creativity_score=85, technique_score=90, expression_score=80, notes="Detail-oriented, excels in painting.")
    )

    # s3
    create_and_seed_student(
        "s3", 
        models.Student(id="s3", name="Amit Kumar", grade="9", section="B", roll="05"),
        models.MedicalRecord(student_id="s3", height="170cm", weight="60kg", blood_group="B+", vision_left="6/6", vision_right="6/6", bmi="20.8", health_status="Healthy", notes="Asthma history, currently managed."),
        models.LibraryRecord(student_id="s3", currently_borrowed="None", overdue_count=0, favorite_genres="Comics", notes="Reluctant reader."),
        models.SportsRecord(student_id="s3", primary_sport="None", team_participation="None", stamina_score=40, strength_score=50, agility_score=45, notes="Avoids physical education classes."),
        models.ArtsRecord(student_id="s3", primary_discipline="Music", club_participation="Choir", creativity_score=70, technique_score=60, expression_score=65, notes="Inconsistent attendance in choir practice.")
    )

    # s4
    create_and_seed_student("s4", models.Student(id="s4", name="Neha Singh", grade="10", section="A", roll="22"), None, None, None, None)
    
    # s5
    create_and_seed_student("s5", models.Student(id="s5", name="Vikram Gupta", grade="11", section="Science", roll="11"), None, None, None, None)
    
    print("Isolated seeding complete!")

if __name__ == "__main__":
    seed()
