"""
app/schemas/student.py — Student Request and Response Schemas
"""

from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class StudentCreateRequest(BaseModel):
    """Schema for creating a new student and their associated user account."""
    email: EmailStr = Field(..., description="Unique email address for the student's user account")
    first_name: str = Field(..., min_length=1, max_length=100, description="Student's first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Student's last name")
    roll_number: str = Field(..., min_length=1, max_length=50, description="Academic roll identifier")
    grade: str = Field(..., min_length=1, max_length=20, description="Grade level, e.g., 'Grade 9'")
    section: str = Field(..., min_length=1, max_length=20, description="Classroom section, e.g., 'A'")
    academic_year: str = Field("2026-27", min_length=4, max_length=10, description="Academic cycle year")
    date_of_birth: Optional[date] = Field(None, description="Date of birth")
    phone: Optional[str] = Field(None, max_length=20, description="Optional contact number")
