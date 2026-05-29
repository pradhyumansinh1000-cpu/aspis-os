"""
app/schemas/auth.py — Authentication Request/Response Schemas
"""

import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.models.user import UserRole
from app.schemas.base import BaseSchema


# ─── Register ─────────────────────────────────────────────────────────────────
class InstitutionRegisterRequest(BaseSchema):
    """First-time institution onboarding: creates institution + admin user."""
    institution_name: str = Field(..., min_length=3, max_length=255)
    institution_slug: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")
    admin_first_name: str = Field(..., min_length=1, max_length=100)
    admin_last_name: str = Field(..., min_length=1, max_length=100)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("admin_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserRegisterRequest(BaseSchema):
    """Admin registers a new user (student/teacher/parent) within their institution."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole
    phone: str | None = Field(None, pattern=r"^\+?[\d\s\-]{10,15}$")


# ─── Login ────────────────────────────────────────────────────────────────────
class LoginRequest(BaseSchema):
    email: EmailStr
    password: str


class TokenResponse(BaseSchema):
    """Returned on successful login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Access token TTL in seconds


class RefreshRequest(BaseSchema):
    refresh_token: str


# ─── User Profile ─────────────────────────────────────────────────────────────
class UserResponse(BaseSchema):
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role: UserRole
    institution_id: uuid.UUID
    is_active: bool
    is_verified: bool
    avatar_url: str | None = None
    created_at: datetime


class ChangePasswordRequest(BaseSchema):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
