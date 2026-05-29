import re
import os

with open("main.py.backup", "r") as f:
    content = f.read()

# 1. Imports
content = content.replace("from database import engine, get_db", "from database import get_student_db\nimport os")
content = content.replace("models.Base.metadata.create_all(bind=engine)", "")

# 2. Add helper function
helper = """
def get_all_gr_numbers():
    if not os.path.exists("./student_databases"):
        return []
    return [f.replace(".db", "") for f in os.listdir("./student_databases") if f.endswith(".db")]
"""
content = content.replace("# Routes\n", "# Routes\n" + helper + "\n")

# 3. Refactor GET all routes
get_all_patterns = [
    ("get_arts_records", "ArtsRecord", "r.student_id", """{
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
        }"""),
    ("get_medical_records", "MedicalRecord", "r.student_id", """{
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
        }"""),
    ("get_sports_records", "SportsRecord", "r.student_id", """{
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
        }"""),
    ("get_library_records", "LibraryRecord", "r.student_id", """{
            "studentId": r.student_id,
            "currentlyBorrowed": r.currently_borrowed,
            "overdueCount": r.overdue_count,
            "favoriteGenres": r.favorite_genres,
            "notes": r.notes,
            "readingLogs": [],
            "updatedAt": r.updated_at.isoformat() if r.updated_at else "",
            "updatedBy": "Ms. L. Iyer"
        }""")
]

for func_name, model_name, key, dict_str in get_all_patterns:
    old_func = re.search(f'def {func_name}\\(db: Session = Depends\\(get_db\\)\\):.*?return result', content, flags=re.DOTALL)
    if old_func:
        new_func = f"""def {func_name}():
    result = {{}}
    for gr in get_all_gr_numbers():
        db = next(get_student_db(gr))
        try:
            r = db.query(models.{model_name}).first()
            if r:
                result[{key}] = {dict_str}
        finally:
            db.close()
    return result"""
        content = content.replace(old_func.group(0), new_func)


# 4. Refactor POST/PUT single student routes
def replace_single_route(match):
    func_sig = match.group(1)
    body = match.group(2)
    # Remove db from signature
    new_sig = func_sig.replace(", db: Session = Depends(get_db)", "").replace("db: Session = Depends(get_db)", "")
    
    # We need to find the student_id or gr variable.
    # It's usually `student_id: str` or extracted from `data`
    
    # Inject db creation
    new_body = f"""
    db = next(get_student_db(student_id))
    try:
{body}
    finally:
        db.close()"""
    # Fix indentation for body
    indented_body = "\n".join(["        " + line.strip() if line.strip() else "" for line in body.split("\n")])
    new_body = f"""
    db = next(get_student_db(student_id))
    try:{indented_body}
    finally:
        db.close()"""
        
    return f"def {new_sig}:{new_body}"

# 5. We can simply use Depends to inject a dynamic DB if we use a request! But writing the manual logic is safer.
# Wait, it's easier to just do a global replace for Depends(get_db).

with open("main.py", "w") as f:
    f.write(content)
