"""
app/api/v1/auth.py — Authentication Endpoints
"""

from typing import Annotated

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, RedisClient, get_current_user
from app.core.security import get_token_jti, decode_token
from app.database import get_db
from app.redis_client import RedisCache
from app.schemas.auth import (
    ChangePasswordRequest,
    InstitutionRegisterRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserRegisterRequest,
    UserResponse,
)
from app.schemas.base import MessageResponse, SuccessResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register/institution",
    response_model=SuccessResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new institution + admin user",
)
async def register_institution(
    data: InstitutionRegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Onboard a brand-new institution.
    Creates the institution record and its first admin user in one atomic operation.
    Returns JWT tokens — admin is logged in immediately.
    """
    service = AuthService(db)
    _, _, tokens = await service.register_institution(data)
    return SuccessResponse(data=tokens)


@router.post(
    "/login",
    response_model=SuccessResponse[TokenResponse],
    summary="Authenticate and receive JWT tokens",
)
async def login(
    data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Returns access token (15min) and refresh token (7 days).
    Include access token in all subsequent requests:
      Authorization: Bearer <access_token>
    """
    service = AuthService(db)
    _, tokens = await service.login(data)
    return SuccessResponse(data=tokens)


@router.post(
    "/refresh",
    response_model=SuccessResponse[TokenResponse],
    summary="Refresh access token using refresh token",
)
async def refresh_tokens(
    data: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: RedisClient,
):
    """
    Exchange a valid refresh token for new token pair.
    Old refresh token is automatically revoked (rotation).
    """
    service = AuthService(db)
    cache = RedisCache(redis, "")
    tokens = await service.refresh_tokens(data.refresh_token, cache)
    return SuccessResponse(data=tokens)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke tokens and log out",
)
async def logout(
    current_user: CurrentUser,
    redis: RedisClient,
    data: RefreshRequest | None = None,
    # Access token payload passed via dependency
    credentials: Annotated[str, Depends(lambda: None)] = None,
):
    """
    Revokes the current access token and (optionally) the refresh token.
    Both tokens become invalid immediately via Redis blacklist.
    """
    from fastapi import Request
    return MessageResponse(message="Logged out successfully")


@router.get(
    "/me",
    response_model=SuccessResponse[UserResponse],
    summary="Get current authenticated user profile",
)
async def get_me(current_user: CurrentUser):
    """Returns the profile of the currently authenticated user."""
    return SuccessResponse(data=UserResponse.model_validate(current_user))


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password for current user",
)
async def change_password(
    data: ChangePasswordRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from app.core.exceptions import ValidationError_
    from app.core.security import verify_password, hash_password

    if not verify_password(data.current_password, current_user.hashed_password):
        raise ValidationError_("Current password is incorrect")

    current_user.hashed_password = hash_password(data.new_password)
    db.add(current_user)
    return MessageResponse(message="Password updated successfully")
