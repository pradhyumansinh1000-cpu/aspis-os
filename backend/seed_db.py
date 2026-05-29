from database import SessionLocal, engine
import models

def seed():
    db = SessionLocal()
    
    print("Wiping existing database...")
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
        
    print("Seeding database with mock students...")
    
    students = [
        models.Student(id="s1", name="Rahul Sharma", grade="9", section="A", roll="12"),
        models.Student(id="s2", name="Priya Patel", grade="9", section="A", roll="18"),
        models.Student(id="s3", name="Amit Kumar", grade="9", section="B", roll="05"),
        models.Student(id="s4", name="Neha Singh", grade="10", section="A", roll="22"),
        models.Student(id="s5", name="Vikram Gupta", grade="11", section="Science", roll="11")
    ]
    db.add_all(students)
    db.commit()

    # Medical
    db.add(models.MedicalRecord(student_id="s1", height="165cm", weight="70kg", blood_group="O+", vision_left="6/12", vision_right="6/9", bmi="25.7", health_status="Needs Attention", notes="Slightly overweight, poor vision might affect board work."))
    db.add(models.MedicalRecord(student_id="s2", height="160cm", weight="50kg", blood_group="A+", vision_left="6/6", vision_right="6/6", bmi="19.5", health_status="Healthy", notes="Fit and active."))
    db.add(models.MedicalRecord(student_id="s3", height="170cm", weight="60kg", blood_group="B+", vision_left="6/6", vision_right="6/6", bmi="20.8", health_status="Healthy", notes="Asthma history, currently managed."))

    # Library
    db.add(models.LibraryRecord(student_id="s1", currently_borrowed="Dune", overdue_count=2, favorite_genres="Science Fiction, Fantasy", notes="Avid reader, but often returns books late."))
    db.add(models.LibraryRecord(student_id="s2", currently_borrowed="A Brief History of Time", overdue_count=0, favorite_genres="Non-fiction, Science", notes="Advanced reading level."))
    db.add(models.LibraryRecord(student_id="s3", currently_borrowed="None", overdue_count=0, favorite_genres="Comics", notes="Reluctant reader."))

    # Sports
    db.add(models.SportsRecord(student_id="s1", primary_sport="Cricket", team_participation="School Team B", stamina_score=60, strength_score=75, agility_score=65, notes="Good strength but low stamina. Correlates with high BMI."))
    db.add(models.SportsRecord(student_id="s2", primary_sport="Basketball", team_participation="School Team A", stamina_score=90, strength_score=80, agility_score=95, notes="Excellent athlete, high energy."))
    db.add(models.SportsRecord(student_id="s3", primary_sport="None", team_participation="None", stamina_score=40, strength_score=50, agility_score=45, notes="Avoids physical education classes."))

    # Arts
    db.add(models.ArtsRecord(student_id="s1", primary_discipline="Drama", club_participation="Theater Club", creativity_score=90, technique_score=70, expression_score=95, notes="Very expressive, great communication skills."))
    db.add(models.ArtsRecord(student_id="s2", primary_discipline="Visual Arts", club_participation="Art Club", creativity_score=85, technique_score=90, expression_score=80, notes="Detail-oriented, excels in painting."))
    db.add(models.ArtsRecord(student_id="s3", primary_discipline="Music", club_participation="Choir", creativity_score=70, technique_score=60, expression_score=65, notes="Inconsistent attendance in choir practice."))

    db.commit()
    print("Seeding complete!")

if __name__ == "__main__":
    seed()
