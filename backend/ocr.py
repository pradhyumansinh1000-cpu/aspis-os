import logging
import time

logger = logging.getLogger(__name__)

def process_exam_image(filename: str, student_id: str = "s1") -> dict:
    """
    Simulates a highly advanced OCR pipeline that extracts question-wise performance.
    In an enterprise deployment, this would use Azure Document Intelligence or Tesseract OCR.
    For this OS showcase, we use deterministic simulation to guarantee stability without heavy local binaries.
    """
    # Simulate processing time
    time.sleep(1.5)
    
    score_variance = len(filename) % 5
    
    result = {
        "student_id": student_id,
        "subject": "Advanced Mathematics",
        "total_score": 85 + score_variance,
        "max_score": 100,
        "confidence_score": 0.94,
        "questions": [
            {"q_num": "1a", "topic": "Calculus (Derivatives)", "awarded": 10, "max": 10, "ocr_text": "f'(x) = 2x + 5"},
            {"q_num": "1b", "topic": "Calculus (Integrals)", "awarded": 8, "max": 10, "ocr_text": "int(2x) = x^2 + C, missed constant"},
            {"q_num": "2a", "topic": "Linear Algebra (Matrices)", "awarded": 5, "max": 10, "ocr_text": "Det(A) calculated incorrectly as 14 instead of 24."},
            {"q_num": "3a", "topic": "Probability", "awarded": 10, "max": 10, "ocr_text": "P(A|B) = P(B|A)P(A)/P(B)"}
        ],
        "ai_analysis": "Student shows exceptional grasp of Calculus and Probability, but fundamental arithmetic errors in Matrix operations cost them 5 points. Recommend targeted practice on Determinants."
    }
    
    return result
