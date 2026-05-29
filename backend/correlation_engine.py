import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

def build_correlation_dataframe(students, medical, library, sports, arts, attendance_simulated=None):
    """
    Constructs a flattened pandas DataFrame for multi-domain ML correlation.
    """
    data = []
    
    # Create lookup dicts
    med_lookup = {r.student_id: r for r in medical}
    lib_lookup = {r.student_id: r for r in library}
    spo_lookup = {r.student_id: r for r in sports}
    art_lookup = {r.student_id: r for r in arts}
    
    for s in students:
        m = med_lookup.get(s.id)
        l = lib_lookup.get(s.id)
        sp = spo_lookup.get(s.id)
        a = art_lookup.get(s.id)
        
        # Extract numerical features for ML
        try:
            bmi = float(m.bmi) if m and m.bmi else 20.0
        except ValueError:
            bmi = 20.0
            
        sports_avg = (sp.stamina_score + sp.strength_score + sp.agility_score) / 3.0 if sp else 50.0
        reading_overdue = l.overdue_count if l else 0
        arts_creativity = a.creativity_score if a else 50.0
        
        # Simulate attendance and academic score for demo purposes (usually pulled from DB)
        # Using hash of ID to create deterministic fake attendance
        hash_val = int(s.id.replace('s', '')) if s.id.startswith('s') else 10
        attendance = 95.0 - (hash_val * 2) if hash_val > 3 else 98.0
        math_score = 85.0 + (sports_avg - 50)*0.2 - (bmi - 20)*0.5 + (attendance - 90)*1.5
        
        data.append({
            "student_id": s.id,
            "name": s.name,
            "bmi": bmi,
            "sports_avg": sports_avg,
            "reading_overdue": reading_overdue,
            "arts_creativity": arts_creativity,
            "attendance": attendance,
            "math_score": max(0, min(100, math_score)) # clamp 0-100
        })
        
    return pd.DataFrame(data)

def run_predictive_risk_model(df: pd.DataFrame):
    """
    Uses an Isolation Forest to detect anomalous student profiles (e.g., dropping performance).
    Returns a list of risk objects.
    """
    if df.empty:
        return []
        
    features = ['bmi', 'sports_avg', 'attendance', 'math_score']
    X = df[features].fillna(df[features].mean())
    
    # Train Isolation Forest
    model = IsolationForest(contamination=0.2, random_state=42)
    df['anomaly_score'] = model.fit_predict(X)
    
    # Extract Anomalies (where anomaly_score == -1)
    anomalies = df[df['anomaly_score'] == -1]
    
    risks = []
    for _, row in anomalies.iterrows():
        reasons = []
        if row['attendance'] < 85:
            reasons.append(f"Low Attendance ({row['attendance']}%)")
        if row['sports_avg'] < 40:
            reasons.append("Declining physical stamina/sports activity")
        if row['bmi'] > 25:
            reasons.append("High BMI flagged by Medical")
        if row['math_score'] < 60:
            reasons.append("Significant drop in Mathematics OCR scores")
            
        if not reasons:
            reasons.append("Statistical deviation from peer group baseline")
            
        risks.append({
            "student_id": row['student_id'],
            "name": row['name'],
            "risk_type": "Multi-Domain Predictive Risk",
            "severity": "High" if len(reasons) > 2 else "Medium",
            "description": "Correlated ML Risk: " + " + ".join(reasons) + " → Predicts future academic decline if unaddressed."
        })
        
    return risks
