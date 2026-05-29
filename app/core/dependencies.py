"""
app/core/dependencies.py — FastAPI Dependency Injection

Dependencies are the clean way to:
  1. Share resources (DB sessions, Redis) without global state
  2. Enforce authentication/authorization
  3. Apply tenant isolation consistently

All auth dependencies raise HTTP 401/403 — never 404 (avoids user enumeration).
"""

import uuid
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token, get_token_jti, get_token_subject
from app.database import get_db
from app.models.user import User, UserRole
from app.redis_client import TokenBlacklist, get_redis

# ─── Scheme ───────────────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer(auto_error=False)

# ─── Type aliases ─────────────────────────────────────────────────────────────
DBSession = Annotated[AsyncSession, Depends(get_db)]
RedisClient = Annotated[aioredis.Redis, Depends(get_redis)]


# ─── Core Auth Dependency ─────────────────────────────────────────────────────
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DBSession,
    redis: RedisClient,
) -> User:
    """
    Validates the JWT Bearer token and returns the authenticated User.
    
    Steps:
      1. Extract token from Authorization header
      2. Decode and validate JWT signature + expiry
      3. Check if token JTI is blacklisted (logged out)
      4. Load user from DB (checks active status)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    try:
        payload = decode_token(credentials.credentials)
        token_type = payload.get("type")
        if token_type != "access":
            raise credentials_exception  # Refresh tokens can't be used as access tokens

        user_id = get_token_subject(payload)
        jti = get_token_jti(payload)
    except (JWTError, ValueError):
        raise credentials_exception

    # Check token blacklist (Redis O(1) lookup)
    blacklist = TokenBlacklist(redis)
    if await blacklist.is_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    # Load user from DB
    result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(user_id),
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


# ─── Role-Based Dependencies ──────────────────────────────────────────────────
CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    """
    Factory that creates a dependency enforcing one of the specified roles.
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user = Depends(require_roles(UserRole.ADMIN))):
            ...
    """
    async def _check_role(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {[r.value for r in roles]}",
            )
        return current_user
    return _check_role


# ─── Pre-built Role Dependencies ──────────────────────────────────────────────
require_admin = require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
require_teacher = require_roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
require_student = require_roles(UserRole.STUDENT)
require_parent = require_roles(UserRole.PARENT)
require_medical_staff = require_roles(UserRole.MEDICAL_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)

# Any authenticated user (no role restriction)
AnyUser = Annotated[User, Depends(get_current_user)]


# ─── Tenant Isolation Helper ──────────────────────────────────────────────────
def check_same_institution(user: User, institution_id: uuid.UUID) -> None:
    """
    Raises 403 if the user's institution_id doesn't match the requested resource.
    Call this in service layer for cross-tenant protection.
    """
    if user.institution_id != institution_id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to resources from another institution is not allowed",
        )


async def verify_student_dpdpa_consent(
    student_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Check if the student has valid guardian consent recorded under DPDPA.
    Raises 400 Bad Request if consent is missing or false.
    """
    from app.models.student import Student
    
    result = await db.execute(
        select(Student.guardian_consent_given).where(Student.id == student_id)
    )
    consent = result.scalar()
    
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DPDPA Violation: Parental consent not recorded for this student."
        )
